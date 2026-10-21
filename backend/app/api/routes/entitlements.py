"""Learner-facing view of the effective module and algorithm entitlements."""

from datetime import datetime, timezone

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from backend.app.api.dependencies import get_current_user
from backend.app.core.feature_access import has_feature_access, is_feature_enabled
from backend.infrastructure.database.database import get_db
from backend.infrastructure.database.models import FeaturePolicy, Subscription, SubscriptionPlan, User

router = APIRouter(prefix="/api/entitlements", tags=["Feature Entitlements"])


@router.get("/me")
def get_my_entitlements(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    policies = db.query(FeaturePolicy).filter(FeaturePolicy.is_archived.is_(False)).order_by(FeaturePolicy.label.asc()).all()
    active_subscription = (
        db.query(Subscription, SubscriptionPlan)
        .join(SubscriptionPlan, SubscriptionPlan.plan_id == Subscription.plan_id)
        .filter(
            Subscription.user_id == current_user.user_id,
            Subscription.status.in_(("active", "past_due")),
            Subscription.current_period_end.is_not(None),
            Subscription.current_period_end > datetime.now(timezone.utc),
        )
        .order_by(Subscription.current_period_end.desc().nullslast())
        .first()
    )
    current_plan = active_subscription[1] if active_subscription else None
    return {
        "subscription": {
            "status": active_subscription[0].status if active_subscription else "free",
            "plan_name": current_plan.name if current_plan else "Free",
            "period_end": active_subscription[0].current_period_end if active_subscription else None,
        },
        "features": [
            {
                "feature_key": policy.feature_key,
                "label": policy.label,
                "description": policy.description,
                "is_premium": bool(policy.is_premium),
                "is_enabled": bool(is_feature_enabled(policy)),
                "has_access": has_feature_access(db, current_user, policy.feature_key),
            }
            for policy in policies
        ]
    }
