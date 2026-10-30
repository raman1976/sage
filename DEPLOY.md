# Sage Deployment Guide

Sage = ADHD productivity copilot + autonomous task agent, powered by Nemotron
models on Nebius Token Factory.

## What you need to deploy

1. **Backend** (FastAPI) — runs on a Nebius GPU Cloud instance (or any host).
   Needs `NEBIUS_API_KEY` and exposes a public URL.
2. **Frontend** (React/Vite) — static site hosted on Vercel/Netlify/GitHub Pages.
   Needs `VITE_API_URL` pointing at your backend.
3. Share the **frontend URL** with others.

---

## Option 1: Fastest path (Vercel frontend + Nebius backend instance)

### A. Backend — deploy to Nebius GPU Cloud

1. On Nebius, launch a GPU Cloud instance with Docker.
2. SSH in and clone this repo.
3. Create `backend/.env` from `backend/.env.example` and set your `NEBIUS_API_KEY`.
4. Build and run:

```bash
docker build -t sage-app .
docker run -d -p 8000:8000 --env-file backend/.env sage-app
```

5. Note your instance's public IP / domain → e.g. `https://sage-api.yourdomain.com`.

### B. Frontend — deploy to Vercel

```bash
cd frontend
npx vercel
```

When prompted, add the environment variable:

```
VITE_API_URL = https://sage-api.yourdomain.com
```

Deploy. Vercel gives you a link like `https://sage.vercel.app` — share that.

---

## Option 2: Netlify frontend

```bash
cd frontend
npx netlify deploy --prod
```

Set `VITE_API_URL` in Netlify site settings to your backend URL.

---

## Verify it's live

Open your frontend link. You should see:
- Home chat with Sage
- Floating "Sage Tasks" panel (top-right)
- Create a task → Sage plans with Nemotron 3 Ultra → executes steps with Nano/Super

Check backend usage anytime:

```bash
curl https://sage-api.yourdomain.com/api/usage
```

---

## Environment variables recap

| File | Variable | Purpose |
|------|----------|---------|
| `backend/.env` | `NEBIUS_API_KEY` | Your Nebius Token Factory key (never in frontend) |
| `frontend` | `VITE_API_URL` | Public backend URL (e.g. `https://sage-api.yourdomain.com`) |

---

## Tiers used (credit-efficient)

- **Ultra** (`nemotron-3-ultra-550b`) — task planning (serious reasoning)
- **Super** (`nemotron-3-super-120b`) — default task execution
- **Nano** (`Nemotron-3-Nano-30B`) — simple steps, greetings, casual chat

Usage is logged locally at `backend/usage_ledger.jsonl` and via `GET /api/usage`.
