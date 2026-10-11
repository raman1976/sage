from openai import AsyncOpenAI
from app.core.config import settings
from typing import List, Dict, Optional
import logging

logger = logging.getLogger(__name__)

SYSTEM_PROMPTS = {
    "calm": """You are Sage, a gentle ADHD support companion in Calm Mode. Your purpose is to help the user recover from overwhelm and find calm.

Guidelines:
- Speak gently, in short sentences (1-3 sentences max per response)
- Acknowledge feelings without judgment
- Use simple grounding language: breathing, senses, present moment
- Never give unsolicited productivity advice
- If the user asks for an exercise, guide them through breathing or 5-4-3-2-1 grounding step by step
- Stay present and supportive""",

    "companion": """You are Sage, a warm ADHD companion in Companion Mode. You're here to think with, work alongside, or rehearse with the user.

Guidelines:
- Be warm, present, and gently encouraging
- Four modes available:
  1. Rubber Duck — Help them think through problems by asking one thoughtful question at a time. Don't give solutions unless asked.
  2. Brain Dump — Listen as they unload everything, then help organize into Tasks, Worries, Ideas, Reminders.
  3. Body Double — Stay quietly present while they work. Optional gentle check-ins.
  4. Conversation Practice — Roleplay the other person. Give gentle feedback if asked.
- Match the mode's energy. Be curious, not prescriptive.
- Keep responses short (2-4 sentences) unless they ask for more.""",

    "focus": """You are Sage, a focused ADHD companion in Focus Mode. Your role is to help the user maintain attention on a single task.

Guidelines:
- Help them define a clear, single task and duration
- Offer gentle time-remaining reminders (halfway, 2 minutes left)
- Provide a "parking lot" for distracting thoughts — capture them so they can return to focus
- Support mental bookmarks so they can resume after interruption
- Keep responses minimal during active focus sessions
- Celebrate completion gently""",

    "plan": """You are Sage, a planning ADHD companion in Plan Mode. Help make overwhelming things manageable.

Guidelines:
- Break big tasks into 3-5 small, concrete steps (each completable in <15 minutes)
- Show one step at a time, celebrate completion (brief, genuine)
- If stuck, help split the current step into even smaller micro-steps
- Offer "Decision Simplifier" — when they list multiple tasks, recommend one to start with and briefly explain why (urgency, deadline, effort)
- Momentum Keeper: after each completed step, auto-suggest the next tiny action
- Offer "Start Focus Session" to hand off to Focus Mode with the selected task
- Keep responses encouraging but concise""",

    "idle": """You are Sage, a gentle ADHD support companion. You're here to help with focus, planning, calm, or just keeping company.

Guidelines:
- Be warm, brief, and non-judgmental
- Ask what they need: focus, planning, calm, or company
- Don't overwhelm with suggestions — offer one clear option at a time""",
}


class NemotronService:
    def __init__(self):
        self._client: Optional[AsyncOpenAI] = None
        self._initialized = False

    def _get_client(self) -> AsyncOpenAI:
        if self._client is None:
            if not settings.NEBIUS_API_KEY:
                raise ValueError("NEBIUS_API_KEY not configured")
            self._client = AsyncOpenAI(
                api_key=settings.NEBIUS_API_KEY,
                base_url=settings.NEBIUS_BASE_URL,
            )
        return self._client

    def is_available(self) -> bool:
        return bool(settings.NEBIUS_API_KEY)

    def get_system_prompt(self, mode: str) -> str:
        return SYSTEM_PROMPTS.get(mode, SYSTEM_PROMPTS["idle"])

    async def chat(
        self,
        mode: str,
        message: str,
        history: List[Dict[str, str]] = None,
    ) -> str:
        """
        Send a chat message to Nemotron with conversation history.
        
        Args:
            mode: Current Sage mode (calm, companion, focus, plan, idle)
            message: User's message
            history: Previous messages as [{"role": "user|assistant", "content": "..."}]
        
        Returns:
            AI response as string
        """
        if not self.is_available():
            raise ValueError("Nemotron not configured. Set NEBIUS_API_KEY in environment.")

        client = self._get_client()
        system_prompt = self.get_system_prompt(mode)

        messages = [{"role": "system", "content": system_prompt}]
        
        if history:
            for msg in history[-10:]:  # Limit context window
                if msg.get("role") in ("user", "assistant") and msg.get("content"):
                    messages.append({"role": msg["role"], "content": msg["content"]})
        
        messages.append({"role": "user", "content": message})

        try:
            response = await client.chat.completions.create(
                model=settings.NEBIUS_MODEL,
                messages=messages,
                temperature=0.7,
                max_tokens=500,
            )
            content = response.choices[0].message.content.strip()
            # Strip internal reasoning traces that some models emit
            # e.g., "Here's a thinking process: ..." or similar patterns
            # Take content after the first reasoning marker, or the whole content
            # if no reasoning prefix detected
            markers = [
                "Here's a thinking process:",
                "thinking process:",
                "The thinking process:",
                "I'll think through:",
                "Let me reason:",
                "Let me think:",
                "Reasoning:",
            ]
            # If content starts with a known reasoning marker, extract after it
            first_line = content.split('\n')[0].strip()
            if any(first_line.startswith(m) for m in markers):
                # Find the end of the reasoning block
                # Join remaining lines, looking for the actual answer
                rest = '\n'.join(content.split('\n')[1:])
                # Look for common answer starters and take from there
                answer_starters = [
                    "I'd", "I will", "I can", "Got it", "Here's",
                    "My", "My response", "My suggestion",
                ]
                combined = content + " " + rest
                for starter in answer_starters:
                    idx = combined.lower().find(starter.lower())
                    if idx > len("here's a thinking process:") + 20:
                        # Found an actual answer starter after reasoning
                        result = combined[idx:].strip()
                        return result if result else content.split('\n')[-1].strip()
                # If no specific starter found, just take the last non-empty line
                for line in reversed(content.split('\n')):
                    line = line.strip()
                    if line and not line.startswith('*') and not line.startswith('1.') and not line.startswith('2.') and not line.startswith('3.'):
                        return line
                return content.split('\n')[-1].strip()
            # No reasoning prefix - return as-is
            # Further clean: remove leading dots/connectors
            result = content.lstrip('.').strip()
            return result if result else content
        except Exception as e:
            logger.error(f"Nemotron chat error: {e}")
            raise


nemotron_service = NemotronService()