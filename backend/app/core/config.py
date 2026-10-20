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
    DB_POOL_SIZE: int = Field(default=3, ge=1, le=100)
    DB_MAX_OVERFLOW: int = Field(default=2, ge=0, le=100)
    DB_POOL_TIMEOUT_SECONDS: int = Field(default=10, ge=1, le=120)
    DB_POOL_RECYCLE_SECONDS: int = Field(default=300, ge=30, le=3600)

    # Shared rate limits are required when the API runs in multiple processes.
    # Leave REDIS_URL empty for local development; the limiter uses bounded
    # in-process memory in that case.
    REDIS_URL: str = ""
    REDIS_KEY_PREFIX: str = "stemstudio:ratelimit"
    REDIS_MAX_CONNECTIONS: int = Field(default=100, ge=1, le=10000)
    REDIS_SOCKET_TIMEOUT_SECONDS: float = Field(default=0.5, gt=0, le=10)
    REDIS_RATE_LIMIT_FAIL_OPEN: bool = True
    PLATFORM_STATS_CACHE_SECONDS: int = Field(default=30, ge=1, le=600)

    # Supabase (Postgres & API)
    SUPABASE_URL: str = ""
    SUPABASE_ANON_KEY: str = ""
    SUPABASE_SERVICE_ROLE_KEY: str = ""

    @field_validator("DATABASE_URL", mode="before")
    @classmethod
    def format_database_url(cls, v: str) -> str:
        if isinstance(v, str):
            if v.startswith("mysql://"):
                v = v.replace("mysql://", "mysql+pymysql://", 1)
            elif v.startswith("postgres://"):
                v = v.replace("postgres://", "postgresql+psycopg2://", 1)
            elif v.startswith("postgresql://") and not v.startswith("postgresql+"):
                v = v.replace("postgresql://", "postgresql+psycopg2://", 1)
            
            # Clean cloud query parameters like ssl-mode which PyMySQL rejects (keep sslmode for Postgres)
            if "?" in v and "mysql" in v:
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
    JWT_ACCESS_TOKEN_EXPIRE_MINUTES: int = 15
    JWT_REFRESH_TOKEN_EXPIRE_DAYS: int = 7
    # Extended refresh-token lifetime when the user checks "Remember me".
    JWT_REMEMBER_ME_EXPIRE_DAYS: int = 30
    AUTH_REAUTH_MAX_AGE_MINUTES: int = Field(default=10, ge=1, le=60)
    EMAIL_VERIFICATION_TOKEN_EXPIRE_HOURS: int = Field(default=24, ge=1, le=168)
    PASSWORD_RESET_TOKEN_EXPIRE_MINUTES: int = Field(default=20, ge=5, le=120)

    # CORS & Frontend
    FRONTEND_URL: str = "http://localhost:5173"
    TRUST_X_FORWARDED_FOR: bool = False
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
    # This escape hatch is honored only when DEBUG is also enabled.
    ALLOW_UNVERIFIED_SIGNUP: bool = False
    EMAILS_FROM_EMAIL: str = "noreply@stemstudio.com"
    EMAILS_FROM_NAME: str = "STEM Studio Support"
    SUPPORT_OWNER_EMAILS: str = ""

    # Judge0 (server-to-server sandbox integration for custom code)
    # Keep these values only on the backend host; never expose them to Vite.
    JUDGE0_URL: str = ""
    JUDGE0_API_KEY: str = ""
    JUDGE0_AUTH_HEADER: str = "X-Auth-Token"
    JUDGE0_TIMEOUT_SECONDS: int = Field(default=20, ge=1, le=120)
    JUDGE0_RATE_LIMIT_PER_MINUTE: int = Field(default=20, ge=1, le=300)

    # Alibaba Cloud Model Studio (Qwen API Key for Octa AI Tutor)
    DASHSCOPE_API_KEY: str = ""

    # App
    APP_NAME: str = "STEM Studio"
    DEBUG: bool = False

    model_config = SettingsConfigDict(
        env_file=("backend/.env", ".env", "../.env"),
        env_file_encoding="utf-8",
        case_sensitive=True,
        extra="ignore",
    )


@lru_cache()
def get_settings() -> Settings:
    """Cache settings so .env is only read once."""
    return Settings()
