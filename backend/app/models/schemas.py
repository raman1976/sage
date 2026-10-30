from pydantic import BaseModel
from typing import Literal, List, Optional


class TaskStepSchema(BaseModel):
    id: str
    title: str
    description: str
    status: str
    tier: str
    result: Optional[str] = None
    error: Optional[str] = None
    executed_at: Optional[str] = None


class TaskSchema(BaseModel):
    id: str
    goal: str
    status: str
    steps: List[TaskStepSchema]
    current_step_index: int
    created_at: str
    updated_at: str
    error: Optional[str] = None
    progress: dict


class CreateTaskRequest(BaseModel):
    goal: str


class CreateTaskResponse(BaseModel):
    task: TaskSchema


class ExecuteTaskRequest(BaseModel):
    task_id: str
    all: bool = False


class ExecuteTaskResponse(BaseModel):
    task: TaskSchema


class TaskListResponse(BaseModel):
    tasks: List[TaskSchema]


class HealthResponse(BaseModel):
    status: Literal["ok"]
    name: str


class AgentStateRequest(BaseModel):
    mode: str


class AgentStateResponse(BaseModel):
    mode: str


class ChatMessage(BaseModel):
    role: Literal["user", "assistant"]
    content: str


class ChatRequest(BaseModel):
    mode: str
    message: str
    history: Optional[List[dict]] = None
    personality: Optional[str] = None


class ChatResponse(BaseModel):
    reply: str


class ModeSuggestionRequest(BaseModel):
    history: Optional[List[dict]] = None


class ModeSuggestionResponse(BaseModel):
    mode: Optional[str] = None