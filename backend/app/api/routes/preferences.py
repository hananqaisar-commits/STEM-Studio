from typing import Literal

from fastapi import APIRouter, Depends
from pydantic import BaseModel
from sqlalchemy.orm import Session

from backend.app.api.dependencies import get_current_user
from backend.infrastructure.database.database import get_db
from backend.infrastructure.database.models import User, UserPreference

router = APIRouter(prefix="/api/preferences", tags=["Preferences"])


class ThemeUpdate(BaseModel):
    theme: Literal["light", "dark"]


@router.get("")
def get_preferences(current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    preference = db.query(UserPreference).filter(UserPreference.user_id == current_user.user_id).first()
    return {"theme": preference.theme if preference else None}


@router.patch("")
def update_preferences(
    payload: ThemeUpdate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    preference = db.query(UserPreference).filter(UserPreference.user_id == current_user.user_id).first()
    if preference is None:
        preference = UserPreference(user_id=current_user.user_id, theme=payload.theme)
        db.add(preference)
    else:
        preference.theme = payload.theme
    db.commit()
    return {"theme": preference.theme}
