# chatbot-backend/app/core/config.py
from pydantic_settings import BaseSettings, SettingsConfigDict
from typing import List


class Settings(BaseSettings):
    OPENAI_API_KEY: str = ""
    REDIS_URL: str = "redis://localhost:6379"
    DEBUG: bool = False
    ALLOWED_ORIGINS: List[str] = ["*"]

    model_config = SettingsConfigDict(env_file=".env", env_file_encoding="utf-8")


settings = Settings()
