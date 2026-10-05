from agent.sage_agent import SageAgent, SageMode


def main():
    sage = SageAgent()

    print("Sage is awake 🌿")
    print("Current state:", sage.get_state())

    sage.set_mode(SageMode.FOCUS)

    print("New state:", sage.get_state())


if __name__ == "__main__":
    main()