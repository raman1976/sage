from fastapi import APIRouter, HTTPException
from app.models.schemas import HealthResponse, AgentStateResponse
from app.services.agent import agent_service

router = APIRouter()


@router.get("/health", response_model=HealthResponse)
async def health_check():
    return HealthResponse(status="ok", name="Sage")


@router.get("/api/state", response_model=AgentStateResponse)
async def get_agent_state():
    state = agent_service.get_state()
    return AgentStateResponse(mode=state["mode"])