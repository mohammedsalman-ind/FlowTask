import os
import json
import io
import ast
import re
from datetime import datetime, date, timedelta
from fastapi import FastAPI, HTTPException, File, UploadFile, Form
from fastapi.responses import JSONResponse
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, ConfigDict, Field
from dotenv import load_dotenv
from google import genai
from pypdf import PdfReader

load_dotenv()

# Setup Gemini Client
GEMINI_API_KEY = os.getenv("GEMINI_API_KEY")
if not GEMINI_API_KEY:
    print("Warning: GEMINI_API_KEY is not set. The endpoints relying on Gemini will fail.")

try:
    client = genai.Client(api_key=GEMINI_API_KEY)
except Exception as e:
    print(f"Failed to initialize Gemini client: {e}")
    client = None

app = FastAPI(title="FlowTask ML API")

# Allow frontend to access this API
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"], # In production, restrict to frontend URL
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ---- Models — Task Parse ----

class ParseTaskRequest(BaseModel):
    text: str = Field(..., description="The natural language text of the task.")

class ParseTaskResponse(BaseModel):
    title: str = Field(..., description="A concise title for the task.")
    due_date: str | None = Field(
        None, 
        description="The due date of the task in ISO 8601 format (e.g., 2026-06-29T17:00:00Z). Null if no date is mentioned."
    )
    priority: str = Field(
        "medium", 
        description="Priority of the task. Must be one of: 'low', 'medium', 'high'."
    )
    tags: list[str] = Field(
        default_factory=list, 
        description="A list of relevant tags extracted from the text."
    )
    context: str = Field(
        "personal", 
        description="The context/category of the task. Must be one of: 'work', 'personal', 'health', 'study'."
    )

# ---- Models — Meeting Analysis ----

class AnalyzeMeetingRequest(BaseModel):
    model_config = ConfigDict(extra="allow")

    transcript: str | None = Field(None, description="Full meeting transcript text.")
    text: str | None = Field(None, description="Alternate transcript text field.")
    meeting_text: str | None = Field(None, description="Alternate transcript text field.")
    meetingText: str | None = Field(None, description="Alternate transcript text field.")
    content: str | None = Field(None, description="Alternate transcript text field.")
    title: str = Field("", description="Meeting title.")
    input_type: str = Field("transcript", description="'transcript' or 'recording'.")

class KeyNote(BaseModel):
    point: str = Field(..., description="The main point text.")
    category: str = Field(..., description="One of: decision, discussion, blocker, information.")

class ActionItem(BaseModel):
    task: str = Field(..., description="Clear description of what needs to be done.")
    assignee: str = Field("Unassigned", description="Person name or 'Unassigned'.")
    due: str | None = Field(None, description="Date string or null.")
    priority: str = Field("medium", description="One of: high, medium, low.")

class AnalyzeMeetingResponse(BaseModel):
    summary: str = Field(..., description="3-5 sentence executive summary.")
    key_notes: list[KeyNote] = Field(default_factory=list)
    action_items: list[ActionItem] = Field(default_factory=list)

# ---- Models — Extracted Task Preview (Task 2) ----

class ExtractedTask(BaseModel):
    title: str = Field(..., description="Task title. If unknown, set to 'To be known'.")
    description: str = Field(..., description="Details/description of task. If unknown, set to 'To be known'.")
    priority: str = Field("Low", description="Priority of the task. Keep as 'Low'.")
    status: str = Field("todo", description="Always 'todo'.")
    type: str = Field("work", description="Always 'work'.")
    recurrence: str = Field("one-time", description="Always 'one-time'.")
    due_date: str | None = Field(None, description="ISO 8601 date string if inferable, else null.")
    tags: list[str] = Field(default_factory=list, description="Tags from context. Empty list if none.")

class ExtractedTasksResponse(BaseModel):
    tasks: list[ExtractedTask] = Field(default_factory=list)

# ---- Helper Functions ----

def extract_text_from_pdf(pdf_bytes: bytes) -> str:
    try:
        pdf_file = io.BytesIO(pdf_bytes)
        reader = PdfReader(pdf_file)
        text = ""
        for page in reader.pages:
            page_text = page.extract_text()
            if page_text:
                text += page_text + "\n"
        return text.strip()
    except Exception as e:
        print(f"PDF extraction error: {e}")
        return ""

def calculate_priority(due_date_str: str | None) -> str:
    if not due_date_str:
        return "Low"
    try:
        # Extracts just YYYY-MM-DD part from ISO date string
        clean_date_str = due_date_str.split('T')[0]
        parsed_date = datetime.strptime(clean_date_str, "%Y-%m-%d").date()
        today_date = date.today()
        diff_days = (parsed_date - today_date).days
        
        if diff_days <= 1:
            return "High"
        elif diff_days <= 2:
            return "Medium"
        else:
            return "Low"
    except Exception as e:
        print(f"Error calculating priority for date '{due_date_str}': {e}")
        return "Low"

def to_gemini_schema(model_class) -> dict:
    schema = model_class.model_json_schema()
    
    defs = schema.pop("$defs", {})
    
    def resolve_ref(ref_str: str) -> dict:
        ref_key = ref_str.split("/")[-1]
        if ref_key in defs:
            return clean_schema(defs[ref_key])
        return {}

    def clean_schema(node):
        if isinstance(node, dict):
            if "$ref" in node:
                return resolve_ref(node["$ref"])
                
            new_node = {}
            for k, v in node.items():
                if k == "title" and isinstance(v, str):
                    continue
                elif k == "type":
                    if isinstance(v, str):
                        new_node[k] = v.upper()
                    else:
                        new_node[k] = clean_schema(v)
                else:
                    new_node[k] = clean_schema(v)
            return new_node
        elif isinstance(node, list):
            return [clean_schema(item) for item in node]
        return node

    return clean_schema(schema)

def strip_markdown_json_fences(text: str) -> str:
    text = (text or "").strip()
    text = re.sub(r"^\s*```(?:json|JSON)?\s*", "", text)
    text = re.sub(r"\s*```\s*$", "", text)
    return text.strip()

def extract_json_from_text(text: str) -> dict:
    cleaned = strip_markdown_json_fences(text)

    for candidate in (cleaned, text):
        try:
            parsed = json.loads(candidate)
            if isinstance(parsed, dict):
                return parsed
        except Exception:
            pass

    first_brace = cleaned.find("{")
    last_brace = cleaned.rfind("}")
    if first_brace != -1 and last_brace != -1 and last_brace > first_brace:
        try:
            parsed = json.loads(cleaned[first_brace:last_brace + 1])
            if isinstance(parsed, dict):
                return parsed
        except Exception:
            pass

    decoder = json.JSONDecoder()
    for index, char in enumerate(cleaned):
        if char not in "{[":
            continue
        try:
            parsed, _ = decoder.raw_decode(cleaned[index:])
            if isinstance(parsed, dict):
                return parsed
        except json.JSONDecodeError:
            continue

    try:
        parsed = ast.literal_eval(cleaned)
        if isinstance(parsed, dict):
            return parsed
    except Exception:
        pass

    raise ValueError("No valid JSON object found in Gemini response.")

def split_transcript_statements(transcript: str) -> list[str]:
    statements = []
    for raw_line in (transcript or "").splitlines():
        line = raw_line.strip()
        if not line:
            continue
        parts = re.split(r"(?<=[.!?])\s+", line)
        statements.extend(part.strip() for part in parts if part.strip())
    if not statements:
        statements = [
            part.strip()
            for part in re.split(r"(?<=[.!?])\s+", transcript or "")
            if part.strip()
        ]
    return statements

def split_speaker_statement(statement: str) -> tuple[str | None, str]:
    match = re.match(r"^\s*([A-Z][A-Za-z .'-]{1,40})\s*:\s*(.+)$", statement)
    if match:
        return match.group(1).strip(), match.group(2).strip()
    return None, statement.strip()

BAD_ACTION_PATTERNS = [
    r"^action items?:?$",
    r"^next steps?:?$",
    r"^follow-?ups?:?$",
    r"^tasks?:?$",
    r"^todo:?$",
    r"^summary:?$",
    r"\bany concerns\b",
    r"\bany questions\b",
    r"\bquestions or concerns\b",
    r"\bhow are we\b",
    r"\bwhere are we\b",
    r"\bstatus update\b",
    r"\bstandup\b",
    r"\bdiscussion\b",
    r"\bwe discussed\b",
    r"\bwe talked about\b",
    r"\blet'?s discuss\b",
    r"\bconcerns or risks\b",
]

ACTION_INTENT_PATTERN = re.compile(
    r"\b("
    r"will|need to|needs to|should|must|has to|have to|todo|to do|"
    r"follow up|assign|assigned|task|owner|due|deadline|by tomorrow|by friday|"
    r"complete|finish|send|prepare|review|update|fix|implement|deploy|test|"
    r"schedule|create|share|deliver|resolve|investigate|finalize|call|meet"
    r")\b",
    re.IGNORECASE,
)

LEADING_OWNER_PATTERN = re.compile(
    r"^\s*([A-Z][A-Za-z .'-]{1,40})\s+"
    r"(?:will|needs? to|should|must|has to|is going to|is responsible for|to)\s+",
    re.IGNORECASE,
)

DUE_PHRASE_PATTERN = re.compile(
    r"\b(?:"
    r"(?:by|before|due|on)\s+"
    r"(?:today|tomorrow|monday|tuesday|wednesday|thursday|friday|saturday|sunday|"
    r"next week|next month|[A-Z][a-z]+\s+\d{1,2}(?:,\s*\d{4})?|\d{1,2}[/-]\d{1,2}(?:[/-]\d{2,4})?)"
    r"|next\s+(?:week|month|monday|tuesday|wednesday|thursday|friday|saturday|sunday)"
    r"|today|tomorrow|monday|tuesday|wednesday|thursday|friday|saturday|sunday"
    r")\b",
    re.IGNORECASE,
)

def is_bad_action_task(task: str) -> bool:
    value = " ".join((task or "").split()).strip(" -:")
    if not value:
        return True
    lowered = value.lower()
    if value.endswith("?"):
        return True
    if len(value) < 12 or len(value.split()) <= 2:
        return True
    if any(re.search(pattern, lowered, re.IGNORECASE) for pattern in BAD_ACTION_PATTERNS):
        return True
    return not ACTION_INTENT_PATTERN.search(value)

def infer_assignee(task: str, fallback_speaker: str | None = None) -> str:
    match = LEADING_OWNER_PATTERN.match(task or "")
    if match:
        return match.group(1).strip()
    assigned_match = re.search(
        r"\b(?:assigned to|owner is|owned by)\s+([A-Z][A-Za-z .'-]{1,40})\b",
        task or "",
        re.IGNORECASE,
    )
    if assigned_match:
        return assigned_match.group(1).strip()
    if fallback_speaker:
        lowered = (task or "").lower()
        if re.search(r"\b(i|i'll|i will|me|my|we|we'll|we will)\b", lowered):
            return fallback_speaker
    return "Unassigned"

def clean_action_task(task: str) -> str:
    value = " ".join((task or "").split()).strip(" -:")
    value = re.sub(r"^action items?:\s*", "", value, flags=re.IGNORECASE)
    value = re.sub(r"^next steps?:\s*", "", value, flags=re.IGNORECASE)
    value = re.sub(
        r"^\s*[A-Z][A-Za-z .'-]{1,40}\s+"
        r"(?:will|needs? to|should|must|has to|is going to|is responsible for|to)\s+",
        "",
        value,
        flags=re.IGNORECASE,
    )
    value = re.sub(r"\s+", " ", value).strip(" -:")
    if value:
        value = value[0].upper() + value[1:]
    return value

def parse_due_date_locally(due_text: str) -> str | None:
    value = re.sub(r"^\s*(?:by|before|due|on)\s+", "", (due_text or "").strip(), flags=re.IGNORECASE)
    value = value.strip()
    if not value:
        return None

    today = date.today()
    lowered = value.lower()
    if lowered == "today":
        return datetime.combine(today, datetime.min.time()).isoformat()
    if lowered == "tomorrow":
        return datetime.combine(today + timedelta(days=1), datetime.min.time()).isoformat()
    if lowered == "next week":
        return datetime.combine(today + timedelta(days=7), datetime.min.time()).isoformat()
    if lowered == "next month":
        return datetime.combine(today + timedelta(days=30), datetime.min.time()).isoformat()

    weekdays = {
        "monday": 0,
        "tuesday": 1,
        "wednesday": 2,
        "thursday": 3,
        "friday": 4,
        "saturday": 5,
        "sunday": 6,
    }
    weekday_match = re.match(r"^(next\s+)?(monday|tuesday|wednesday|thursday|friday|saturday|sunday)$", lowered)
    if weekday_match:
        target_weekday = weekdays[weekday_match.group(2)]
        days_ahead = (target_weekday - today.weekday()) % 7
        if days_ahead == 0 or weekday_match.group(1):
            days_ahead += 7
        return datetime.combine(today + timedelta(days=days_ahead), datetime.min.time()).isoformat()

    month_match = re.search(
        r"\b(january|february|march|april|may|june|july|august|september|october|november|december)\s+(\d{1,2})(?:,\s*(\d{4}))?\b",
        lowered,
        re.IGNORECASE,
    )
    if month_match:
        months = {
            "january": 1,
            "february": 2,
            "march": 3,
            "april": 4,
            "may": 5,
            "june": 6,
            "july": 7,
            "august": 8,
            "september": 9,
            "october": 10,
            "november": 11,
            "december": 12,
        }
        month = months[month_match.group(1).lower()]
        day = int(month_match.group(2))
        year = int(month_match.group(3) or today.year)
        try:
            parsed_date = date(year, month, day)
            if parsed_date < today and not month_match.group(3):
                parsed_date = date(year + 1, month, day)
            return datetime.combine(parsed_date, datetime.min.time()).isoformat()
        except ValueError:
            return None

    numeric_match = re.match(r"^(\d{1,2})[/-](\d{1,2})(?:[/-](\d{2,4}))?$", value)
    if numeric_match:
        month = int(numeric_match.group(1))
        day = int(numeric_match.group(2))
        year = int(numeric_match.group(3) or today.year)
        if year < 100:
            year += 2000
        try:
            parsed_date = date(year, month, day)
            if parsed_date < today and not numeric_match.group(3):
                parsed_date = date(year + 1, month, day)
            return datetime.combine(parsed_date, datetime.min.time()).isoformat()
        except ValueError:
            return None

    return None

def normalize_due_date(raw_due: str | None, source_text: str) -> str | None:
    due_text = (raw_due or "").strip()
    if not due_text or due_text.lower() in {"none", "null", "n/a", "not specified"}:
        match = DUE_PHRASE_PATTERN.search(source_text or "")
        due_text = match.group(0) if match else ""
    if not due_text:
        return None

    try:
        import dateparser
        parsed = dateparser.parse(
            due_text,
            settings={
                "RELATIVE_BASE": datetime.now(),
                "PREFER_DATES_FROM": "future",
                "RETURN_AS_TIMEZONE_AWARE": False,
            },
        )
        if parsed:
            return parsed.isoformat()
    except Exception as err:
        print(f"Could not parse due date '{due_text}': {err}")

    local_due = parse_due_date_locally(due_text)
    if local_due:
        return local_due

    return raw_due if raw_due else None

def extract_action_items_from_transcript(transcript: str) -> list[ActionItem]:
    action_items = []
    seen = set()
    for statement in split_transcript_statements(transcript):
        speaker, content = split_speaker_statement(statement)
        if is_bad_action_task(content):
            continue

        assignee = infer_assignee(content, fallback_speaker=speaker)
        task = clean_action_task(content)
        if is_bad_action_task(task):
            continue

        due = normalize_due_date(None, content)
        priority = infer_priority_from_text(content)
        key = (task.lower(), assignee.lower(), due or "")
        if key in seen:
            continue
        seen.add(key)
        action_items.append(ActionItem(task=task, assignee=assignee, due=due, priority=priority))
        if len(action_items) >= 8:
            break
    return action_items

def infer_priority_from_text(text: str) -> str:
    lowered = (text or "").lower()
    if re.search(r"\b(asap|urgent|critical|blocker|immediately|today|tomorrow)\b", lowered):
        return "high"
    if re.search(r"\b(soon|this week|next week|important|priority)\b", lowered):
        return "medium"
    if re.search(r"\b(when you get a chance|low priority|later)\b", lowered):
        return "low"
    return "medium"

def post_process_action_items(action_items: list[ActionItem], transcript: str) -> list[ActionItem]:
    processed = []
    seen = set()
    for item in action_items:
        source_text = item.task or ""
        if is_bad_action_task(source_text):
            continue

        assignee = item.assignee if item.assignee and item.assignee != "Unassigned" else infer_assignee(source_text)
        task = clean_action_task(source_text)
        if is_bad_action_task(task):
            continue

        due = normalize_due_date(item.due, source_text)
        priority = item.priority if item.priority in {"high", "medium", "low"} else infer_priority_from_text(source_text)
        key = (task.lower(), assignee.lower(), due or "")
        if key in seen:
            continue
        seen.add(key)
        processed.append(ActionItem(task=task, assignee=assignee, due=due, priority=priority))

    if processed:
        return processed
    return extract_action_items_from_transcript(transcript)

def extract_key_notes_from_transcript(transcript: str) -> list[KeyNote]:
    important_pattern = re.compile(
        r"\b(decided|decision|blocked|blocker|risk|issue|important|deadline|launch|release|approved|problem|concern|priority)\b",
        re.IGNORECASE,
    )
    notes = []
    seen = set()
    statements = split_transcript_statements(transcript)
    for statement in statements:
        speaker, content = split_speaker_statement(statement)
        point = content if speaker else statement
        if not important_pattern.search(point):
            continue
        cleaned = point.strip(" -\t")
        if not cleaned or cleaned.lower() in seen:
            continue
        seen.add(cleaned.lower())
        category = "information"
        lowered = cleaned.lower()
        if "decided" in lowered or "decision" in lowered or "approved" in lowered:
            category = "decision"
        elif "blocked" in lowered or "blocker" in lowered or "risk" in lowered or "issue" in lowered or "concern" in lowered:
            category = "blocker"
        notes.append(KeyNote(point=cleaned[:240], category=category))
        if len(notes) >= 5:
            break

    if notes:
        return notes

    for statement in statements[:5]:
        _, content = split_speaker_statement(statement)
        point = content.strip(" -\t")
        if point:
            notes.append(KeyNote(point=point[:240], category="information"))
    return notes

def request_payload_and_keys(request: AnalyzeMeetingRequest) -> tuple[dict, list[str]]:
    payload = request.model_dump(exclude_none=True)
    extra = getattr(request, "model_extra", None)
    if extra:
        payload.update(extra)
    received_keys = sorted(str(key) for key in getattr(request, "model_fields_set", set()))
    return payload, received_keys

def transcript_from_payload(payload: dict) -> str:
    for field_name in ("transcript", "text", "meeting_text", "meetingText", "content"):
        value = payload.get(field_name)
        if isinstance(value, str) and value.strip():
            return value.strip()
    return ""

def log_final_meeting_response(response: AnalyzeMeetingResponse) -> None:
    print("Final /api/ml/analyze-meeting JSON returned:")
    print(json.dumps(response.model_dump(), ensure_ascii=False, default=str))

def fallback_meeting_response(transcript: str) -> AnalyzeMeetingResponse:
    text = " ".join((transcript or "").split())
    if not text:
        return AnalyzeMeetingResponse(
            summary="No meeting transcript content was available to analyze.",
            key_notes=[],
            action_items=[],
        )

    sentences = split_transcript_statements(transcript)
    summary_parts = sentences[:3] or [text[:350]]
    summary = " ".join(summary_parts)
    if len(summary) > 700:
        summary = summary[:697].rstrip() + "..."

    action_items = extract_action_items_from_transcript(transcript)

    key_notes = extract_key_notes_from_transcript(transcript)

    return AnalyzeMeetingResponse(
        summary=summary or "Meeting transcript received, but a detailed AI summary could not be generated.",
        key_notes=key_notes,
        action_items=action_items,
    )

def normalize_meeting_analysis(data: dict, transcript: str) -> AnalyzeMeetingResponse:
    if not isinstance(data, dict):
        return fallback_meeting_response(transcript)

    fallback = fallback_meeting_response(transcript)

    summary = data.get("summary") or data.get("meeting_summary") or data.get("overview")
    if isinstance(summary, list):
        summary = " ".join(str(item).strip() for item in summary if str(item).strip())
    elif summary is not None:
        summary = str(summary).strip()
    if not summary:
        summary = fallback.summary

    valid_categories = {"decision", "discussion", "blocker", "information"}
    raw_notes = data.get("key_notes") or data.get("keyNotes") or data.get("notes") or []
    if isinstance(raw_notes, str):
        raw_notes = [raw_notes]

    key_notes = []
    if isinstance(raw_notes, list):
        for note in raw_notes:
            if isinstance(note, dict):
                point = note.get("point") or note.get("text") or note.get("note") or note.get("summary")
                category = str(note.get("category") or "information").lower()
            else:
                point = note
                category = "information"

            point = str(point or "").strip()
            if not point:
                continue
            if category not in valid_categories:
                category = "information"
            key_notes.append(KeyNote(point=point, category=category))

    valid_priorities = {"high", "medium", "low"}
    raw_actions = data.get("action_items") or data.get("actionItems") or data.get("actions") or data.get("tasks") or []
    if isinstance(raw_actions, str):
        raw_actions = [raw_actions]

    action_items = []
    if isinstance(raw_actions, list):
        for item in raw_actions:
            if isinstance(item, dict):
                task = item.get("task") or item.get("title") or item.get("description") or item.get("action")
                assignee = item.get("assignee") or item.get("owner") or "Unassigned"
                due = item.get("due") or item.get("due_date") or item.get("deadline")
                priority = str(item.get("priority") or "medium").lower()
            else:
                task = item
                assignee = "Unassigned"
                due = None
                priority = "medium"

            task = str(task or "").strip()
            if not task:
                continue
            assignee = str(assignee or "Unassigned").strip() or "Unassigned"
            if due is not None:
                due = str(due).strip() or None
            if priority not in valid_priorities:
                priority = "medium"
            action_items.append(ActionItem(task=task, assignee=assignee, due=due, priority=priority))

    action_items = post_process_action_items(action_items, transcript)

    if not key_notes:
        key_notes = fallback.key_notes

    return AnalyzeMeetingResponse(
        summary=summary,
        key_notes=key_notes,
        action_items=action_items or fallback.action_items,
    )

# ---- Routes ----

@app.get("/api/health")
def health_check():
    return {"status": "healthy", "timestamp": datetime.utcnow().isoformat()}

@app.get("/api/ml/version")
def ml_api_version():
    return {
        "service": "ml-api",
        "version": "meeting-analysis-debug-v2",
        "timestamp": datetime.utcnow().isoformat(),
    }

@app.post("/api/ml/parse", response_model=ParseTaskResponse)
def parse_task(request: ParseTaskRequest):
    if not client:
        raise HTTPException(status_code=500, detail="Gemini client not initialized. Check API key.")
    
    if not request.text.strip():
        raise HTTPException(status_code=400, detail="Text cannot be empty.")

    now_str = datetime.now().isoformat()
    system_instruction = f"""
    You are an intelligent task parsing assistant for a productivity app.
    Your goal is to parse the user's natural language input into a structured task object.
    
    Current local time (for resolving relative dates like 'tomorrow', 'next friday'): {now_str}
    
    Rules:
    - If no specific date/time is mentioned, due_date should be null.
    - If a date is mentioned, format it as a full ISO 8601 datetime string.
    - Priority must be one of: low, medium, high. Default to medium unless urgency is implied.
    - Context must be one of: work, personal, health, study. Infer this based on the content.
    - Extract a concise title (e.g., "Buy groceries" instead of "I need to buy groceries tomorrow").
    - Generate 1 to 3 relevant tags.
    """

    try:
        response = client.models.generate_content(
            model='gemini-2.5-flash',
            contents=request.text,
            config=genai.types.GenerateContentConfig(
                system_instruction=system_instruction,
                response_mime_type="application/json",
                response_schema=to_gemini_schema(ParseTaskResponse),
                temperature=0.0
            ),
        )
        
        data = json.loads(response.text)
        return ParseTaskResponse(**data)
        
    except Exception as e:
        print(f"Error parsing task: {e}")
        raise HTTPException(status_code=500, detail="Failed to parse task from text.")

@app.post("/api/ml/analyze-meeting", response_model=AnalyzeMeetingResponse)
def analyze_meeting(request: AnalyzeMeetingRequest):
    payload, received_keys = request_payload_and_keys(request)
    transcript = transcript_from_payload(payload)
    print("Received /api/ml/analyze-meeting body keys:", received_keys)
    print("Received transcript length:", len(transcript))
    print("Received transcript first 300 chars:", transcript[:300])

    if not transcript:
        return JSONResponse(
            status_code=400,
            content={
                "error": "No transcript provided",
                "received_keys": received_keys,
            },
        )

    request.transcript = transcript
    current_date = date.today().isoformat()

    if not client:
        print("Gemini client not initialized. Returning transcript-based fallback.")
        fallback = fallback_meeting_response(transcript)
        log_final_meeting_response(fallback)
        return fallback

    MEETING_SYSTEM_PROMPT = f"""You are an expert meeting analyst. Analyze the actual transcript provided by the request and return strict JSON only.

    Current date is {current_date}. Resolve relative dates like today, tomorrow, Friday, Monday, and next week using this date.

    Return a single JSON object with exactly these fields:

    {
      "summary": "3-5 sentence executive summary",
      "key_notes": ["string"],
      "action_items": [
        {
          "task": "Clear description of what needs to be done",
          "owner": "Person name or null",
          "deadline": "Date string or null",
          "priority": "high" | "medium" | "low"
        }
      ]
    }

    Rules:
    - Extract ALL action items — anything that sounds like a to-do, deliverable, or follow-up
    - Infer priority from urgency language ("ASAP", "critical", "when you get a chance")
    - If a speaker is mentioned before a task, use them as assignee
    - summary must be plain English, no bullet points
    - Return ONLY valid JSON
    - Do not include markdown fences, backticks, comments, prose, or extra text before or after the JSON object
    - Return ONLY real action items: concrete work someone should do after the meeting
    - Do NOT include questions, headings, greetings, agenda items, status updates, or normal conversation lines as action items
    - Do NOT include strings like "Action items:" or "Any concerns or risks we should be aware of?"
    - Extract owners from speaker names or sentence text whenever possible
    - Extract deadlines from phrases like tomorrow, today, Friday, Monday, next week, by July 10, or due Friday
    - If there are no real action items, return an empty action_items array
    - The summary and notes must describe this transcript, not a generic or sample meeting
    """

    def _call_gemini(strict: bool = False) -> str:
        prompt = request.transcript
        system = MEETING_SYSTEM_PROMPT
        if strict:
            system += "\n\nIMPORTANT: Your previous response was not valid JSON. Return ONLY a raw JSON object. No markdown fences, no explanation text, no trailing notes."

        response = client.models.generate_content(
            model='gemini-2.5-flash',
            contents=prompt,
            config=genai.types.GenerateContentConfig(
                system_instruction=system,
                response_mime_type="application/json",
                temperature=0.1
            ),
        )
        return response.text or ""

    try:
        raw_response = _call_gemini(strict=False)
        print("Gemini raw response:", raw_response)
        data = extract_json_from_text(raw_response)
    except Exception as first_err:
        print(f"First Gemini attempt failed: {first_err}. Retrying with stricter prompt...")
        try:
            raw_response = _call_gemini(strict=True)
            print("Gemini raw response after retry:", raw_response)
            data = extract_json_from_text(raw_response)
        except Exception as retry_err:
            print(f"Retry also failed: {retry_err}")
            fallback = fallback_meeting_response(transcript)
            log_final_meeting_response(fallback)
            return fallback

    # Normalize dates in action items
    try:
        analysis = normalize_meeting_analysis(data, transcript)
        normalized_data = analysis.model_dump()
    except Exception as normalization_err:
        print(f"Meeting analysis normalization failed: {normalization_err}")
        fallback = fallback_meeting_response(transcript)
        log_final_meeting_response(fallback)
        return fallback

    if "action_items" in normalized_data:
        try:
            import dateparser
            for item in normalized_data["action_items"]:
                raw_due = item.get("due")
                if raw_due and isinstance(raw_due, str):
                    parsed = dateparser.parse(raw_due)
                    if parsed:
                        item["due"] = parsed.isoformat()
        except ImportError:
            pass

    try:
        final_response = AnalyzeMeetingResponse(**normalized_data)
    except Exception as validation_err:
        print(f"Meeting analysis validation failed: {validation_err}")
        final_response = fallback_meeting_response(transcript)

    log_final_meeting_response(final_response)
    return final_response

@app.post("/api/ml/analyze-transcript", response_model=ExtractedTasksResponse)
async def analyze_transcript(
    meeting_title: str = Form(...),
    file: UploadFile = File(...)
):
    if not client:
        raise HTTPException(status_code=500, detail="Gemini client not initialized. Check API key.")
        
    filename = file.filename.lower()
    if not (filename.endswith('.txt') or filename.endswith('.pdf')):
        raise HTTPException(status_code=400, detail="Only .txt and .pdf files are supported.")
        
    try:
        file_bytes = await file.read()
        if filename.endswith('.txt'):
            text = file_bytes.decode('utf-8')
        else:
            text = extract_text_from_pdf(file_bytes)
    except Exception as err:
        print(f"Failed to read upload: {err}")
        raise HTTPException(status_code=400, detail="Failed to read upload file contents.")
        
    if not text.strip():
        raise HTTPException(status_code=400, detail="No readable text found in this file.")

    now_str = datetime.now().isoformat()
    system_instruction = f"""
    You are an expert meeting analyst. Analyze the provided meeting transcript and extract genuine action items, tasks, or follow-ups discussed in the meeting. Do not extract general conversations or statements.
    
    Current local time (for resolving relative dates like 'tomorrow', 'next week', 'by Friday'): {now_str}
    
    For each extracted task, populate the following fields exactly:
    - title: Concise task title. If you cannot confidently determine a title, return "To be known".
    - description: Concise details or context of the task. If not derivable from the context, return "To be known".
    - priority: Always return the exact string "Low". (Server will recalculate).
    - status: Always return the exact string "todo".
    - type: Always return the exact string "work".
    - recurrence: Always return the exact string "one-time".
    - due_date: ISO 8601 date string if mentioned or inferable in the transcript, else null.
    - tags: A list of relevant tags (e.g. project name, department). If none are inferable, return an empty array [].
    
    For any field you cannot confidently extract, return the exact string "To be known" (or empty array for tags) rather than guessing or hallucinating.
    Return ONLY valid JSON matching the schema, with no markdown fences, preamble, or comments.
    """

    try:
        response = client.models.generate_content(
            model='gemini-2.5-flash',
            contents=text,
            config=genai.types.GenerateContentConfig(
                system_instruction=system_instruction,
                response_mime_type="application/json",
                response_schema=to_gemini_schema(ExtractedTasksResponse),
                temperature=0.1
            ),
        )
        
        result = json.loads(response.text)
        
        # Recalculate priorities server-side based on due date
        for task in result.get("tasks", []):
            task["priority"] = calculate_priority(task.get("due_date"))
            
        return ExtractedTasksResponse(**result)
        
    except Exception as e:
        import traceback
        traceback.print_exc()
        print(f"Error in Gemini transcript analysis: {e}")
        raise HTTPException(status_code=500, detail="AI extraction failed.")

if __name__ == "__main__":
    import uvicorn
    port = int(os.getenv("PORT", 8000))
    print(f"Starting ML API on port {port}...")
    uvicorn.run(app, host="0.0.0.0", port=port)
