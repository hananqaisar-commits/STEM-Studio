import secrets
from typing import List, Union
from pydantic import Field, field_validator, model_validator
from pydantic_settings import BaseSettings, SettingsConfigDict
from functools import lru_cache
import json
from urllib.parse import urlsplit


class Settings(BaseSettings):
    """STEM Studio Central Application settings loaded from environment variables."""

    # Database
    DATABASE_URL: str = "mysql+pymysql://root:password@localhost/stem_studio"
    DB_POOL_SIZE: int = Field(default=3, ge=1, le=100)
    DB_MAX_OVERFLOW: int = Field(default=2, ge=0, le=100)
    DB_POOL_TIMEOUT_SECONDS: int = Field(default=10, ge=1, le=120)
    DB_POOL_RECYCLE_SECONDS: int = Field(default=300, ge=30, le=3600)
    # Use a single deployment/release job for schema changes when running
    # multiple replicas. Keep enabled by default for the existing one-service setup.
    AUTO_MIGRATE_ON_STARTUP: bool = True

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
    OWNER_ACCESS_TOKEN_EXPIRE_MINUTES: int = Field(default=10, ge=2, le=30)
    OWNER_SESSION_MAX_HOURS: int = Field(default=8, ge=1, le=24)
    OWNER_COOKIE_SECURE: bool | None = None
    OWNER_COOKIE_SAMESITE: str = "lax"
    # Required in production to encrypt owner TOTP secrets independently of JWT signing.
    OWNER_MFA_ENCRYPTION_KEY: str = ""
    EMAIL_VERIFICATION_TOKEN_EXPIRE_HOURS: int = Field(default=24, ge=1, le=168)
    PASSWORD_RESET_TOKEN_EXPIRE_MINUTES: int = Field(default=20, ge=5, le=120)

    # Safepay recurring subscriptions. Credentials are supplied only through
    # the backend host's secret environment configuration.
    SAFEPAY_ENV: str = "sandbox"
    SAFEPAY_SECRET_KEY: str = ""
    SAFEPAY_WEBHOOK_SECRET: str = ""
    SAFEPAY_TIMEOUT_SECONDS: float = Field(default=12, gt=0, le=30)

    @field_validator("SAFEPAY_ENV")
    @classmethod
    def validate_safepay_environment(cls, value: str) -> str:
        normalized = value.strip().lower()
        if normalized not in {"sandbox", "production"}:
            raise ValueError("SAFEPAY_ENV must be sandbox or production")
        return normalized

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

    @field_validator("OWNER_COOKIE_SAMESITE")
    @classmethod
    def validate_owner_cookie_samesite(cls, value: str) -> str:
        normalized = value.strip().lower()
        if normalized not in {"lax", "strict", "none"}:
            raise ValueError("OWNER_COOKIE_SAMESITE must be lax, strict, or none")
        return normalized

    @model_validator(mode="after")
    def validate_production_owner_boundary(self) -> "Settings":
        if not self.DEBUG:
            if "DATABASE_URL" not in self.model_fields_set:
                raise ValueError("Set DATABASE_URL to a managed, persistent production database")
            database_url = urlsplit(self.DATABASE_URL)
            if database_url.scheme.startswith("sqlite"):
                raise ValueError("SQLite is not supported for production accounts; use the shared managed PostgreSQL database")
            if database_url.scheme not in {"postgresql+psycopg2", "postgresql", "mysql+pymysql", "mysql"}:
                raise ValueError("Production DATABASE_URL must use PostgreSQL or MySQL")
            if not database_url.hostname or database_url.hostname.lower() in {"localhost", "127.0.0.1", "::1"}:
                raise ValueError("Production DATABASE_URL must point to a remote managed database")
            if "JWT_SECRET_KEY" not in self.model_fields_set:
                raise ValueError("Set a stable JWT_SECRET_KEY in the production environment")
            if len(self.JWT_SECRET_KEY) < 32 or "change-this" in self.JWT_SECRET_KEY.lower():
                raise ValueError("Set a strong, non-placeholder JWT_SECRET_KEY before production startup")
            if not self.CORS_ORIGINS or "*" in self.CORS_ORIGINS:
                raise ValueError("Production CORS_ORIGINS must list exact frontend origins")
            for origin in self.CORS_ORIGINS:
                parsed = urlsplit(origin)
                if parsed.scheme != "https" or not parsed.netloc or parsed.path or parsed.query or parsed.fragment:
                    raise ValueError("Production CORS_ORIGINS must contain HTTPS origins without paths")
            # The Vercel frontend and Render API are cross-site. Owner sessions
            # use cookies, so browsers require SameSite=None plus Secure.
            if "OWNER_COOKIE_SAMESITE" not in self.model_fields_set:
                self.OWNER_COOKIE_SAMESITE = "none"
        owner_cookie_secure = self.OWNER_COOKIE_SECURE if self.OWNER_COOKIE_SECURE is not None else not self.DEBUG
        if self.OWNER_COOKIE_SAMESITE == "none" and not owner_cookie_secure:
            raise ValueError("OWNER_COOKIE_SECURE must be true when OWNER_COOKIE_SAMESITE is none")
        return self


    # SMTP Email Configuration
    SMTP_TLS: bool = True
    SMTP_USE_SSL: bool = False
    SMTP_PORT: int = 587
    SMTP_HOST: str = "smtp.gmail.com"
    SMTP_USER: str = ""
    SMTP_PASSWORD: str = ""
    # This escape hatch is honored only when DEBUG is also enabled.
    ALLOW_UNVERIFIED_SIGNUP: bool = False
    EMAILS_FROM_EMAIL: str = ""
    EMAILS_FROM_NAME: str = "STEM Studio Support"
    # Deprecated: owner access is granted only by the provisioned database role.
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
