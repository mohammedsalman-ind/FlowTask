# FlowTask ⚡

**AI-Powered Task Manager** with context-aware reminders, FullCalendar integration, goal/habit tracking, voice input, and an intelligent **AI Meeting Assistant** to turn recordings and transcripts into action items. Features a clean, premium Beige theme.

## Tech Stack

| Layer | Tech |
|-------|------|
| Frontend | React 18 + Vite + TypeScript + TailwindCSS v3 |
| State | Zustand |
| Backend API | Node.js + Express + TypeScript |
| ML API | Python + FastAPI + spaCy + Gemini |
| Database | Supabase (PostgreSQL) |
| Cache | Upstash Redis |

## Getting Started

### Prerequisites
- Node.js 20+
- npm 10+
- Python 3.11+ (for ML API)

### Setup

1. **Clone and install dependencies:**
   ```bash
   cd flowtask
   npm install
   ```

2. **Set up environment variables:**
   ```bash
   cp frontend/.env.example frontend/.env
   cp backend/node-api/.env.example backend/node-api/.env
   ```
   Fill in your Supabase, Redis, and API keys.

3. **Run the database migration:**
   - Go to your Supabase project → SQL Editor
   - Paste the contents of `database/migration.sql`
   - Run it
   - *Note: If using the AI Meeting Assistant, ensure you also run the `meetings` table creation script provided in the Implementation Plan.*

4. **Start development servers:**
   ```bash
   # All services at once
   npm run dev:all

   # Or individually
   npm run dev:frontend   # http://localhost:5173
   npm run dev:api        # http://localhost:4000
   ```

## Project Structure

```
flowtask/
├── frontend/          # React + Vite + TailwindCSS
├── backend/
│   ├── node-api/      # Express REST API
│   └── ml-api/        # FastAPI ML service
├── shared/            # Shared TypeScript types
├── database/          # SQL migrations
└── docker-compose.yml # Local dev environment
```

## License

MIT
