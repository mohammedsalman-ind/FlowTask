import os
import traceback
import json
from dotenv import load_dotenv
from google import genai
from pydantic import BaseModel, Field

load_dotenv(dotenv_path="backend/ml-api/.env")

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
                    continue  # Delete metadata title strings
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

GEMINI_API_KEY = os.getenv("GEMINI_API_KEY")
print("API Key exists:", bool(GEMINI_API_KEY))

client = genai.Client(api_key=GEMINI_API_KEY)

try:
    gemini_schema = to_gemini_schema(ExtractedTasksResponse)
    print("Cleaned Schema:")
    import pprint
    pprint.pprint(gemini_schema)
    
    response = client.models.generate_content(
        model='gemini-2.5-flash',
        contents="Meeting transcript: We need to design the UI for the home page by next Friday. John is responsible for it.",
        config=genai.types.GenerateContentConfig(
            system_instruction="Extract tasks",
            response_mime_type="application/json",
            response_schema=gemini_schema,
            temperature=0.1
        ),
    )
    print("Success!")
    print(response.text)
except Exception as e:
    traceback.print_exc()
