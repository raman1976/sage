from agent.sage_agent import SageAgent, SageMode


class AgentService:
    def __init__(self):
        self._agent = SageAgent()

    def get_state(self) -> dict:
        return self._agent.get_state()

    def set_mode(self, mode: str) -> dict:
        try:
            sage_mode = SageMode(mode.lower())
            self._agent.set_mode(sage_mode)
            return self._agent.get_state()
        except ValueError:
            raise ValueError(f"Invalid mode: {mode}. Valid modes: {[m.value for m in SageMode]}")


agent_service = AgentService()