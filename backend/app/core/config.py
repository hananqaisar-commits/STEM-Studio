import secrets
from typing import List, Union
from pydantic import Field, field_validator
from pydantic_settings import BaseSettings, SettingsConfigDict
from functools import lru_cache
import json


class Settings(BaseSettings):
    """STEM Studio Central Application settings loaded from environment variables."""

    # Database
    DATABASE_URL: str = "mysql+pymysql://root:password@localhost/stem_studio"

    @field_validator("DATABASE_URL", mode="before")
    @classmethod
    def format_database_url(cls, v: str) -> str:
        if isinstance(v, str):
            if v.startswith("mysql://"):
                v = v.replace("mysql://", "mysql+pymysql://", 1)
            elif v.startswith("postgres://"):
                v = v.replace("postgres://", "postgresql://", 1)
            
            # Clean Aiven/cloud query parameters like ssl-mode which PyMySQL rejects
            if "?" in v:
                base_url, query_str = v.split("?", 1)
                params = [p for p in query_str.split("&") if not p.lower().startswith(("ssl-mode", "ssl_mode"))]
                v = f"{base_url}?{'&'.join(params)}" if params else base_url
        return v


    # JWT Configuration
    # In production JWT_SECRET_KEY MUST be set via environment variables.
    # A random default is used here so that local development does not run
    # with a well-known secret, but tokens will not survive a server restart.
    JWT_SECRET_KEY: str = Field(default_factory=lambda: secrets.token_urlsafe(32))
    JWT_ALGORITHM: str = "HS256"
    JWT_ACCESS_TOKEN_EXPIRE_MINUTES: int = 30
    JWT_REFRESH_TOKEN_EXPIRE_DAYS: int = 7
    # Extended refresh-token lifetime when the user checks "Remember me".
    JWT_REMEMBER_ME_EXPIRE_DAYS: int = 30

    # CORS & Frontend
    FRONTEND_URL: str = "http://localhost:5173"
    # By default only the configured frontend origin is allowed. Override with
    # a comma-separated list or JSON array in production.
    CORS_ORIGINS: Union[List[str], str] = [FRONTEND_URL]

    @field_validator("CORS_ORIGINS", mode="before")
    @classmethod
    def assemble_cors_origins(cls, v: Union[str, List[str]]) -> List[str]:
        if isinstance(v, str):
            if v.startswith("[") and v.endswith("]"):
                try:
                    return json.loads(v)
                except Exception:
                    pass
            return [i.strip() for i in v.split(",") if i.strip()]
        elif isinstance(v, list):
            return v
        return [FRONTEND_URL]

    @field_validator("JWT_ALGORITHM", mode="before")
    @classmethod
    def validate_jwt_algorithm(cls, v: str) -> str:
        """Reject the insecure 'none' algorithm or any unknown algorithm."""
        allowed = {"HS256", "HS384", "HS512"}
        if v not in allowed:
            raise ValueError(f"JWT_ALGORITHM must be one of {allowed}")
        return v


    # SMTP Email Configuration
    SMTP_TLS: bool = True
    SMTP_PORT: int = 587
    SMTP_HOST: str = "smtp.gmail.com"
    SMTP_USER: str = ""
    SMTP_PASSWORD: str = ""
    EMAILS_FROM_EMAIL: str = "noreply@stemstudio.com"
    EMAILS_FROM_NAME: str = "STEM Studio Support"

    # Judge0 (sandboxed code execution for the Custom Code feature)
    # Point at any Judge0 CE instance, e.g. https://ce.judge0.com or a
    # self-hosted docker deployment. Leave empty to disable execution.
    JUDGE0_URL: str = ""
    JUDGE0_API_KEY: str = ""
    JUDGE0_TIMEOUT_SECONDS: int = 20

    # App
    APP_NAME: str = "STEM Studio"
    DEBUG: bool = False

    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        case_sensitive=True,
    )


@lru_cache()
def get_settings() -> Settings:
    """Cache settings so .env is only read once."""
    return Settings()
