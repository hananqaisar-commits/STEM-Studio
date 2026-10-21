from typing import Literal, Optional

from fastapi import APIRouter, Depends
from pydantic import BaseModel
from sqlalchemy.orm import Session

from backend.app.api.dependencies import get_current_user
from backend.infrastructure.database.database import get_db
from backend.infrastructure.database.models import User, UserPreference

router = APIRouter(prefix="/api/preferences", tags=["Preferences"])


class ThemeUpdate(BaseModel):
    theme: Optional[Literal["light", "dark"]] = None
    marketing_email_opt_in: Optional[bool] = None


@router.get("")
def get_preferences(current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    preference = db.query(UserPreference).filter(UserPreference.user_id == current_user.user_id).first()
    return {
        "theme": preference.theme if preference else None,
        "marketing_email_opt_in": bool(preference.marketing_email_opt_in) if preference else False,
    }


@router.patch("")
def update_preferences(
    payload: ThemeUpdate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    preference = db.query(UserPreference).filter(UserPreference.user_id == current_user.user_id).first()
    if preference is None:
        preference = UserPreference(
            user_id=current_user.user_id,
            theme=payload.theme,
            marketing_email_opt_in=bool(payload.marketing_email_opt_in),
        )
        db.add(preference)
    else:
        if payload.theme is not None:
            preference.theme = payload.theme
        if payload.marketing_email_opt_in is not None:
            preference.marketing_email_opt_in = payload.marketing_email_opt_in
    db.commit()
    return {
        "theme": preference.theme,
        "marketing_email_opt_in": bool(preference.marketing_email_opt_in),
    }
