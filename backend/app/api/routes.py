from fastapi import APIRouter, HTTPException
from fastapi.responses import JSONResponse
from app.models.schemas import (HealthResponse, AgentStateRequest, AgentStateResponse, ChatRequest, ChatResponse, ModeSuggestionRequest, ModeSuggestionResponse, CreateTaskRequest, CreateTaskResponse, ExecuteTaskRequest, ExecuteTaskResponse, TaskListResponse, TaskSchema)
from app.services.agent import agent_service
from app.services.nemotron import nemotron_service
from app.services import usage_ledger
from app.services.task_agent import task_agent

router = APIRouter()


@router.options("/api/state", include_in_schema=False)
async def options_api_state():
    return JSONResponse(status_code=200, content={"message": "ok"})


@router.options("/api/chat", include_in_schema=False)
async def options_api_chat():
    return JSONResponse(status_code=200, content={"message": "ok"})


@router.options("/api/mode-suggestion", include_in_schema=False)
async def options_api_mode_suggestion():
    return JSONResponse(status_code=200, content={"message": "ok"})


@router.get("/health", response_model=HealthResponse)
async def health_check():
    return HealthResponse(status="ok", name="Sage")


@router.get("/api/usage")
async def get_usage(limit: int = 20):
    """Local, dashboard-independent token usage for Sage's Nemotron calls."""
    return JSONResponse(content=usage_ledger.summary(limit=limit))


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
            personality=request.personality,
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


@router.post("/api/mode-suggestion", response_model=ModeSuggestionResponse)
async def mode_suggestion(request: ModeSuggestionRequest):
    try:
        mode = await nemotron_service.suggest_mode(history=request.history or [])
        return ModeSuggestionResponse(mode=mode)
    except ValueError as e:
        if "not configured" in str(e):
            raise HTTPException(
                status_code=503,
                detail="AI companion unavailable: NEBIUS_API_KEY not configured. Set it in your .env file."
            )
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"AI error: {str(e)}")


@router.post("/api/tasks", response_model=CreateTaskResponse)
async def create_task(request: CreateTaskRequest):
    """Create and plan a new autonomous task. Planning uses Nemotron 3 Ultra."""
    if not nemotron_service.is_available():
        raise HTTPException(
            status_code=503,
            detail="AI companion unavailable: NEBIUS_API_KEY not configured. Set it in your .env file."
        )
    task = await task_agent.create_task(request.goal)
    return CreateTaskResponse(task=TaskSchema(**task.to_dict()))


@router.get("/api/tasks", response_model=TaskListResponse)
async def list_tasks():
    """List all tasks, newest first."""
    tasks = task_agent.list_tasks()
    return TaskListResponse(tasks=[TaskSchema(**t.to_dict()) for t in tasks])


@router.get("/api/tasks/{task_id}", response_model=TaskSchema)
async def get_task(task_id: str):
    task = task_agent.get_task(task_id)
    if not task:
        raise HTTPException(status_code=404, detail="Task not found")
    return TaskSchema(**task.to_dict())


@router.post("/api/tasks/{task_id}/execute", response_model=ExecuteTaskResponse)
async def execute_task(task_id: str, request: ExecuteTaskRequest):
    """Execute the next step, or all remaining steps if request.all is True."""
    task = task_agent.get_task(task_id)
    if not task:
        raise HTTPException(status_code=404, detail="Task not found")
    if request.all:
        updated = await task_agent.execute_all(task_id)
    else:
        updated = await task_agent.execute_next_step(task_id)
    if not updated:
        raise HTTPException(status_code=404, detail="Task not found")
    return ExecuteTaskResponse(task=TaskSchema(**updated.to_dict()))


@router.post("/api/tasks/{task_id}/pause", response_model=TaskSchema)
async def pause_task(task_id: str):
    task = await task_agent.pause_task(task_id)
    if not task:
        raise HTTPException(status_code=404, detail="Task not found")
    return TaskSchema(**task.to_dict())


@router.post("/api/tasks/{task_id}/resume", response_model=TaskSchema)
async def resume_task(task_id: str):
    task = await task_agent.resume_task(task_id)
    if not task:
        raise HTTPException(status_code=404, detail="Task not found")
    return TaskSchema(**task.to_dict())


@router.delete("/api/tasks/{task_id}")
async def delete_task(task_id: str):
    if not task_agent.delete_task(task_id):
        raise HTTPException(status_code=404, detail="Task not found")
    return {"status": "deleted"}