FROM python:3.11-slim

WORKDIR /app

ENV PYTHONDONTWRITEBYTECODE=1
ENV PYTHONUNBUFFERED=1

RUN pip install --no-cache-dir --upgrade pip

COPY backend/requirements.txt .
RUN pip install --no-cache-dir -r backend/requirements.txt

# Backend app + shared agent package at repo root
COPY backend/app /app/app
COPY agent /app/agent

# NEBIUS_API_KEY must be supplied at runtime via -e NEBIUS_API_KEY=...
EXPOSE 8000

CMD ["python", "-m", "uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"]
