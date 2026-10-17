from pydantic_settings import BaseSettings
from typing import List


class Settings(BaseSettings):
    APP_NAME: str = "Sage"
    DEBUG: bool = True
    CORS_ORIGINS: List[str] = []  # unused; allow_origin_regex handles all origins

    # Nemotron via Nebius Token Factory (the ONLY AI provider Sage uses).
    NEBIUS_API_KEY: str = ""
    NEBIUS_BASE_URL: str = "https://api.tokenfactory.nebius.com/v1/"
    # Default / ultimate fallback model (Nebius Nemotron only).
    NEBIUS_MODEL: str = "nvidia/nemotron-3-super-120b-a12b"

    # Intelligent routing tiers. IDs verified against the Nebius Token Factory
    # catalog via GET /v1/models — do not invent model IDs.
    NEBIUS_MODEL_NANO: str = "nvidia/NVIDIA-Nemotron-3-Nano-30B-A3B"
    NEBIUS_MODEL_SUPER: str = "nvidia/nemotron-3-super-120b-a12b"
    NEBIUS_MODEL_ULTRA: str = "nvidia/Nemotron-3-Ultra-550b-a55b"

    class Config:
        env_file = ".env"
        case_sensitive = True


settings = Settings()
