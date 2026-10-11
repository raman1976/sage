from pydantic import BaseModel
from typing import Literal, List, Optional


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


class ChatResponse(BaseModel):
    reply: str