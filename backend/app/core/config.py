from pydantic_settings import BaseSettings
from typing import List


class Settings(BaseSettings):
    APP_NAME: str = "Sage"
    DEBUG: bool = True
    CORS_ORIGINS: List[str] = []  # unused; allow_origin_regex handles all origins

    # Nemotron/Nebius configuration
    NEBIUS_API_KEY: str = ""
    NEBIUS_BASE_URL: str = "https://api.studio.nebius.ai/v1"
    NEBIUS_MODEL: str = "nvidia/nemotron-3-ultra"

    class Config:
        env_file = ".env"
        case_sensitive = True


settings = Settings()