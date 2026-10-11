from fastapi import APIRouter, HTTPException
from fastapi.responses import JSONResponse
from app.models.schemas import HealthResponse, AgentStateRequest, AgentStateResponse, ChatRequest, ChatResponse
from app.services.agent import agent_service
from app.services.nemotron import nemotron_service

router = APIRouter()


@router.options("/api/state", include_in_schema=False)
async def options_api_state():
    return JSONResponse(status_code=200, content={"message": "ok"})


@router.options("/api/chat", include_in_schema=False)
async def options_api_chat():
    return JSONResponse(status_code=200, content={"message": "ok"})


@router.get("/health", response_model=HealthResponse)
async def health_check():
    return HealthResponse(status="ok", name="Sage")


@router.get("/api/state", response_model=AgentStateResponse)
async def get_agent_state():
    state = agent_service.get_state()
    return AgentStateResponse(mode=state["mode"])


@router.post("/api/state", response_model=AgentStateResponse, include_in_schema=False)
async def post_agent_state(request: AgentStateRequest):
    """Mode sync from frontend. Accepts {mode} and persists it."""
    try:
        state = agent_service.set_mode(request.mode)
        return AgentStateResponse(mode=state["mode"])
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception:
        return AgentStateResponse(mode="idle")


@router.post("/api/chat", response_model=ChatResponse)
async def chat(request: ChatRequest):
    try:
        reply = await nemotron_service.chat(
            mode=request.mode,
            message=request.message,
            history=request.history,
        )
        return ChatResponse(reply=reply)
    except ValueError as e:
        if "not configured" in str(e):
            raise HTTPException(
                status_code=503,
                detail="AI companion unavailable: NEBIUS_API_KEY not configured. Set it in your .env file."
            )
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"AI error: {str(e)}")