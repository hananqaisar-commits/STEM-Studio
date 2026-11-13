import re
from typing import Literal, Optional

from fastapi import APIRouter, Depends
from pydantic import BaseModel, Field, field_validator
from sqlalchemy.orm import Session

from backend.app.api.dependencies import get_current_user
from backend.infrastructure.database.database import get_db
from backend.infrastructure.database.models import User, UserPreference

router = APIRouter(prefix="/api/preferences", tags=["Preferences"])


class ThemeUpdate(BaseModel):
    theme: Optional[Literal["light", "dark"]] = None
    marketing_email_opt_in: Optional[bool] = None
    preferred_language: Optional[str] = Field(default=None, max_length=80)
    display_name: Optional[str] = Field(default=None, max_length=80)
    avatar_data_url: Optional[str] = Field(default=None, max_length=350_000)
    learning_prompt: Optional[str] = Field(default=None, max_length=1200)

    @field_validator("preferred_language")
    @classmethod
    def normalize_language(cls, value: Optional[str]) -> Optional[str]:
        return value.strip() or None if value is not None else None

    @field_validator("display_name", "learning_prompt")
    @classmethod
    def normalize_optional_text(cls, value: Optional[str]) -> Optional[str]:
        return value.strip() or None if value is not None else None

    @field_validator("avatar_data_url")
    @classmethod
    def validate_avatar_data_url(cls, value: Optional[str]) -> Optional[str]:
        if value is not None and not re.fullmatch(
            r"data:image/(?:png|jpeg|webp);base64,[A-Za-z0-9+/]+={0,2}", value
        ):
            raise ValueError("Profile photo must be a PNG, JPEG, or WebP image.")
        return value


@router.get("")
def get_preferences(current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    preference = db.query(UserPreference).filter(UserPreference.user_id == current_user.user_id).first()
    return {
        "theme": preference.theme if preference else None,
        "marketing_email_opt_in": bool(preference.marketing_email_opt_in) if preference else False,
        "preferred_language": preference.preferred_language if preference else "English",
        "display_name": preference.display_name if preference else None,
        "avatar_data_url": preference.avatar_data_url if preference else None,
        "learning_prompt": preference.learning_prompt if preference else None,
    }


@router.patch("")
def update_preferences(
    payload: ThemeUpdate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    preference = db.query(UserPreference).filter(UserPreference.user_id == current_user.user_id).first()
    if preference is None:
        preference = UserPreference(user_id=current_user.user_id)
        db.add(preference)

    for field, value in payload.model_dump(exclude_unset=True).items():
        if value is not None or field in {"display_name", "avatar_data_url", "learning_prompt"}:
            setattr(preference, field, value)
    db.commit()
    return {
        "theme": preference.theme,
        "marketing_email_opt_in": bool(preference.marketing_email_opt_in),
        "preferred_language": preference.preferred_language or "English",
        "display_name": preference.display_name,
        "avatar_data_url": preference.avatar_data_url,
        "learning_prompt": preference.learning_prompt,
    }
