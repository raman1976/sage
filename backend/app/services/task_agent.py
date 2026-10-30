"""Autonomous task execution agent for Sage.

Takes a high-level goal, plans concrete steps with Nemotron 3 Ultra (serious
reasoning), then executes each step using the intelligent router (Nano for
simple, Super for complex, Ultra for reasoning). Runs as a self-directed
workflow: plan -> execute step-by-step -> report progress.

Usage is recorded to the local ledger via the existing nemotron_service.
"""

from __future__ import annotations

import asyncio
import uuid
from dataclasses import dataclass, field, asdict
from datetime import datetime, timezone
from typing import Any, Dict, List, Optional

from app.services.nemotron import nemotron_service, select_model, build_decision
from app.services.model_router import RouteDecision, DEFAULT_MODELS, ULTRA_MODEL


PLANNER_SYSTEM_PROMPT = """You are Sage's task planner. Break a user's goal into a numbered list of
concrete, executable steps. Each step must be:
- Small enough to complete in one AI turn (under ~5 minutes of work)
- Actionable and specific (no vague "research" or "figure out" steps)
- Ordered sequentially

Reply with ONLY a numbered list. No intro, no outro, no explanation. Example:
1. Draft the email subject line and opening sentence.
2. List the three key action items to include.
3. Proofread for tone and clarity.
"""


STEP_EXECUTOR_SYSTEM_PROMPT = """You are Sage executing one step of a multi-step task.

Your job: complete the single step below and report the result. Be direct and
concise. Do not plan ahead, do not start the next step, do not ask questions.
Just finish this step and summarize what was done in 1-3 short sentences.

If you need information you don't have, say so briefly and suggest the next
best action."""


@dataclass
class TaskStep:
    id: str
    title: str
    description: str
    status: str = "pending"  # pending | in_progress | completed | blocked | skipped
    tier: str = "super"
    result: Optional[str] = None
    error: Optional[str] = None
    executed_at: Optional[str] = None


@dataclass
class Task:
    id: str
    goal: str
    status: str = "planning"  # planning | executing | completed | failed | paused
    steps: List[TaskStep] = field(default_factory=list)
    current_step_index: int = 0
    created_at: str = field(default_factory=lambda: datetime.now(timezone.utc).isoformat())
    updated_at: str = field(default_factory=lambda: datetime.now(timezone.utc).isoformat())
    error: Optional[str] = None

    def to_dict(self) -> Dict[str, Any]:
        return {
            "id": self.id,
            "goal": self.goal,
            "status": self.status,
            "steps": [asdict(s) for s in self.steps],
            "current_step_index": self.current_step_index,
            "created_at": self.created_at,
            "updated_at": self.updated_at,
            "error": self.error,
            "progress": self.progress(),
        }

    def progress(self) -> Dict[str, int]:
        total = len(self.steps)
        done = sum(1 for s in self.steps if s.status == "completed")
        return {"completed": done, "total": total, "percent": round((done / total * 100) if total else 0)}


class TaskAgent:
    """In-memory autonomous task agent. One task at a time per agent instance."""

    def __init__(self):
        self._tasks: Dict[str, Task] = {}
        self._locks: Dict[str, asyncio.Lock] = {}

    def _lock_for(self, task_id: str) -> asyncio.Lock:
        if task_id not in self._locks:
            self._locks[task_id] = asyncio.Lock()
        return self._locks[task_id]

    async def create_task(self, goal: str) -> Task:
        """Plan a new task from a goal. Uses Ultra for the planning step."""
        task = Task(id=str(uuid.uuid4()), goal=goal)
        self._tasks[task.id] = task

        try:
            plan = await self._plan_steps(goal)
            task.steps = [
                TaskStep(
                    id=str(uuid.uuid4()),
                    title=step_text,
                    description=step_text,
                    tier="super",
                )
                for step_text in plan
            ]
            task.status = "executing" if task.steps else "completed"
            task.updated_at = datetime.now(timezone.utc).isoformat()
        except Exception as e:  # noqa: BLE001
            task.status = "failed"
            task.error = str(e)
            task.updated_at = datetime.now(timezone.utc).isoformat()

        return task

    async def _plan_steps(self, goal: str) -> List[str]:
        """Use Ultra to decompose the goal into executable steps."""
        decision = build_decision(
            "ultra",
            DEFAULT_MODELS,
            reason="task-planning",
        )
        # Override to the verified Ultra model ID for serious reasoning.
        decision = RouteDecision(
            tier="ultra",
            model=ULTRA_MODEL,
            enable_thinking=True,
            max_tokens=512,
            temperature=0.4,
            reason="task-planning",
        )

        response = await nemotron_service._run_model(  # noqa: SLF001
            client=nemotron_service._get_client(),  # noqa: SLF001
            decision=decision,
            messages=[
                {"role": "system", "content": PLANNER_SYSTEM_PROMPT},
                {"role": "user", "content": f"Goal: {goal}"},
            ],
            mode="plan",
            personality="ladybug",
            fallback_used=False,
        )

        if not response:
            return []

        lines = [
            line.strip()
            for line in response.split("\n")
            if line.strip()
        ]
        steps = []
        for line in lines:
            cleaned = line.strip()
            # Strip leading "N. " or "N) " or "- " markers.
            import re
            cleaned = re.sub(r"^\d+[\.\)]\s*", "", cleaned)
            cleaned = re.sub(r"^[-•]\s*", "", cleaned)
            if cleaned:
                steps.append(cleaned)
        return steps

    async def execute_next_step(self, task_id: str) -> Optional[Task]:
        """Execute the next pending step. Returns the updated task."""
        async with self._lock_for(task_id):
            task = self._tasks.get(task_id)
            if not task:
                return None
            if task.status not in ("executing", "paused"):
                return task

            # Find next pending step.
            next_idx = None
            for i in range(task.current_step_index, len(task.steps)):
                if task.steps[i].status == "pending":
                    next_idx = i
                    break

            if next_idx is None:
                # All steps done.
                task.status = "completed"
                task.updated_at = datetime.now(timezone.utc).isoformat()
                return task

            step = task.steps[next_idx]
            step.status = "in_progress"
            task.current_step_index = next_idx
            task.updated_at = datetime.now(timezone.utc).isoformat()

            try:
                # Choose tier: Ultra for the last step or complex cues, else router default.
                step_decision = select_model(
                    mode="plan",
                    message=step.description,
                    history=None,
                    models=DEFAULT_MODELS,
                )

                result = await nemotron_service.chat(
                    mode="plan",
                    message=f"Execute this step: {step.description}",
                    history=[
                        {"role": "system", "content": STEP_EXECUTOR_SYSTEM_PROMPT},
                        {"role": "user", "content": f"Task goal: {task.goal}\n\nStep to complete: {step.description}"},
                    ],
                    personality="ladybug",
                )

                step.status = "completed"
                step.result = result
                step.executed_at = datetime.now(timezone.utc).isoformat()
            except Exception as e:  # noqa: BLE001
                step.status = "blocked"
                step.error = str(e)
                task.status = "failed"
                task.error = str(e)

            task.updated_at = datetime.now(timezone.utc).isoformat()
            return task

    async def execute_all(self, task_id: str) -> Task:
        """Execute all remaining steps sequentially (background workflow)."""
        while True:
            task = await self.execute_next_step(task_id)
            if not task:
                raise ValueError(f"Task not found: {task_id}")
            if task.status in ("completed", "failed", "paused"):
                return task
            if task.current_step_index >= len(task.steps) or all(
                s.status != "pending" for s in task.steps
            ):
                return task
            # Small yield so the event loop stays responsive.
            await asyncio.sleep(0)

    def get_task(self, task_id: str) -> Optional[Task]:
        return self._tasks.get(task_id)

    def list_tasks(self) -> List[Task]:
        return sorted(
            self._tasks.values(),
            key=lambda t: t.created_at,
            reverse=True,
        )

    async def pause_task(self, task_id: str) -> Optional[Task]:
        task = self._tasks.get(task_id)
        if not task:
            return None
        if task.status == "executing":
            task.status = "paused"
            task.updated_at = datetime.now(timezone.utc).isoformat()
        return task

    async def resume_task(self, task_id: str) -> Optional[Task]:
        task = self._tasks.get(task_id)
        if not task:
            return None
        if task.status == "paused":
            task.status = "executing"
            task.updated_at = datetime.now(timezone.utc).isoformat()
        return task

    def delete_task(self, task_id: str) -> bool:
        return self._tasks.pop(task_id, None) is not None


task_agent = TaskAgent()
