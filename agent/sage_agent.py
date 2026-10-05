from enum import Enum


class SageMode(str, Enum):
    IDLE = "idle"
    START = "start"
    FOCUS = "focus"
    CALM = "calm"
    PLAN = "plan"


class SageAgent:
    def __init__(self):
        self.mode = SageMode.IDLE

    def set_mode(self, mode: SageMode):
        self.mode = mode

    def get_state(self):
        return {
            "mode": self.mode.value
        }