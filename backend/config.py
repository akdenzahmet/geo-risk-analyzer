import os
from pydantic_settings import BaseSettings

class Settings(BaseSettings):
    PROJECT_NAME: str = "Yapay Zeka Destekli Gayrimenkul ve Risk Analizi"
    DEBUG: bool = os.getenv("DEBUG", "false").lower() == "true"
    API_V1_STR: str = "/api"

    PORT: int = int(os.getenv("PORT", 8081))
    HOST: str = os.getenv("HOST", "0.0.0.0")

    POSTGRES_USER: str = os.getenv("POSTGRES_USER", "postgres")
    POSTGRES_PASSWORD: str = os.getenv("POSTGRES_PASSWORD", "postgres123")
    POSTGRES_SERVER: str = os.getenv("POSTGRES_SERVER", "localhost")
    POSTGRES_PORT: str = os.getenv("POSTGRES_PORT", "5432")
    POSTGRES_DB: str = os.getenv("POSTGRES_DB", "geodb")

    @property
    def DATABASE_URL(self) -> str:
        direct_url = os.getenv("DATABASE_URL")
        if direct_url:
            return direct_url
        return f"postgresql://{self.POSTGRES_USER}:{self.POSTGRES_PASSWORD}@{self.POSTGRES_SERVER}:{self.POSTGRES_PORT}/{self.POSTGRES_DB}"

    class Config:
        case_sensitive = True

settings = Settings()