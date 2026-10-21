"""Learner-facing view of the effective feature entitlements."""

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from backend.app.api.dependencies import get_current_user
from backend.app.core.feature_access import FEATURE_CATALOG, has_feature_access
from backend.infrastructure.database.database import get_db
from backend.infrastructure.database.models import FeaturePolicy, User

router = APIRouter(prefix="/api/entitlements", tags=["Feature Entitlements"])


@router.get("/me")
def get_my_entitlements(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    policies = {
        row.feature_key: row
        for row in db.query(FeaturePolicy).filter(
            FeaturePolicy.feature_key.in_([key for key, _ in FEATURE_CATALOG])
        ).all()
    }
    return {
        "features": [
            {
                "feature_key": key,
                "label": label,
                "is_premium": bool(policies[key].is_premium) if key in policies else False,
                "is_enabled": bool(policies[key].is_enabled) if key in policies else True,
                "has_access": has_feature_access(db, current_user, key),
            }
            for key, label in FEATURE_CATALOG
        ]
    }
