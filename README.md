# Sage — ADHD Productivity Copilot

Sage is a conversational AI companion for people with ADHD. It combines a friendly chat interface with an autonomous task agent that plans and executes goals using Nemotron models on Nebius Token Factory.

## What it is
- Chat companion with four modes: **Focus, Calm, Companion, Plan**
- Autonomous **Task Agent**: enter a goal, Sage plans steps with **Nemotron 3 Ultra** (serious reasoning), then executes step-by-step with **Nano** (simple) and **Super** (complex) to stretch credits
- Local usage ledger (`GET /api/usage`) — independent of the Nebius dashboard
- Personality-driven replies (Bee/Cat/Bunny/Ladybug characters)

## Why it exists
- People with ADHD struggle with task initiation, overwhelm, and context switching
- Most AI chat tools just talk — they don't break goals into executable steps
- Running multiple model tiers keeps latency low and credit costs down

## Impact
- Reduces overwhelm by turning vague goals into numbered, doable steps
- Keeps replies short (1-2 sentences) to match ADHD-friendly communication
- Tracks every model call locally so users see token usage and latency

## How to run locally

### Prerequisites
- Python 3.11+
- Node.js + npm
- Nebius Token Factory API key

### Backend
```powershell
cd backend
$env:PYTHONPATH="C:\path\to\sage"
copy .env.example .env   # set NEBIUS_API_KEY
python -m uvicorn app.main:app --host 0.0.0.0 --port 8000
```

### Frontend
```powershell
cd frontend
npm install
npm run dev
```

Open `http://localhost:5173`.

## How it's deployed

### Backend (Render — free tier)
- Docker build from repo root
- Environment variables: `NEBIUS_API_KEY`, `NEBIUS_BASE_URL`
- URL: `https://sage-1m64.onrender.com`
- Note: free tier sleeps after 15 min idle (first request wakes it)

### Frontend (Vercel)
- Connected to GitHub repo `raman1976/sage`
- Root directory: `frontend`
- Environment variable: `VITE_API_URL=https://sage-1m64.onrender.com`
- Live link: `https://sage-adhd-robot.vercel.app`

## Model tiers used
| Tier | Model | Use |
|------|-------|-----|
| Ultra | nemotron-3-ultra-550b | Task planning (reasoning) |
| Super | nemotron-3-super-120b | Default execution |
| Nano | Nemotron-3-Nano-30B | Simple steps, greetings |

## API endpoints
- `GET /health` — health check
- `POST /api/chat` — chat with Sage
- `POST /api/tasks` — create + plan a task
- `POST /api/tasks/{id}/execute` — run task steps
- `GET /api/tasks` — list tasks
- `GET /api/usage` — local token usage ledger
