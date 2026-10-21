"""Central module and algorithm entitlements shared by owner and learner APIs."""

import json
import re
from datetime import datetime, timedelta, timezone
from pathlib import Path

from fastapi import HTTPException, status
from sqlalchemy.orm import Session

from backend.app.core.owner_security import is_provisioned_owner
from backend.infrastructure.database.models import (
    FeaturePolicy,
    PlanFeature,
    Subscription,
    SubscriptionPlan,
    User,
    UserFeatureOverride,
)


FEATURE_CATALOG: tuple[tuple[str, str], ...] = (
    ("complexity", "Complexity Analysis"),
    ("sorting", "Sorting Algorithms"),
    ("arrays", "Arrays"),
    ("strings", "Strings"),
    ("linkedList", "Linked Lists"),
    ("stackQueue", "Stacks & Queues"),
    ("binarySearch", "Binary Search"),
    ("hashMaps", "Hash Maps"),
    ("bst", "Trees"),
    ("graph", "Graphs"),
    ("recursion", "Recursion"),
    ("backtracking", "Backtracking"),
    ("greedy", "Greedy"),
    ("dp", "Dynamic Programming"),
    ("trie", "Trie"),
    ("os-commands", "Linux Commands"),
    ("os-filesystem", "Linux File System"),
)
FEATURE_LABELS = dict(FEATURE_CATALOG)
FEATURE_KEY_ALIASES = {
    "commands": "os-commands",
    "filesystem": "os-filesystem",
}

_TOPIC_CATALOG_PATH = Path(__file__).resolve().parents[3] / "frontend/src/data/topicCatalog.json"
_ALGORITHM_CATEGORY_IDS: set[str] = set()


def _read_topic_catalog() -> dict[str, list[str]]:
    """Read the shared topic registry; it is the source of future topic keys."""
    try:
        catalog = json.loads(_TOPIC_CATALOG_PATH.read_text(encoding="utf-8"))
    except (OSError, json.JSONDecodeError):
        return {}
    if not isinstance(catalog, dict):
        return {}
    return catalog


def _humanize_key(value: str) -> str:
    return re.sub(r"(?<=[a-z0-9])(?=[A-Z])", " ", value).replace("_", " ").replace("-", " ").strip().title()


def _algorithm_catalog() -> list[tuple[str, str, str]]:
    """Register all DSA topic IDs, including future categories in the shared catalog."""
    catalog = _read_topic_catalog()
    _ALGORITHM_CATEGORY_IDS.clear()
    algorithms: list[tuple[str, str, str]] = []
    for category, topic_ids in catalog.items():
        if not isinstance(category, str) or not re.fullmatch(r"[A-Za-z][A-Za-z0-9_-]{0,39}", category) or not isinstance(topic_ids, list):
            continue
        _ALGORITHM_CATEGORY_IDS.add(category)
        category_label = FEATURE_LABELS.get(category, _humanize_key(category))
        for topic_id in topic_ids:
            if not isinstance(topic_id, str) or not re.fullmatch(r"[A-Za-z0-9_-]{1,60}", topic_id):
                continue
            feature_key = algorithm_feature_key(category, topic_id)
            algorithms.append((feature_key, f"{category_label} · {_humanize_key(topic_id)}", category))
    return algorithms


def algorithm_feature_key(category: str, algorithm_id: str) -> str:
    return f"algorithm.{category}.{algorithm_id}"


def require_algorithm_access(db: Session, user: User, category: str, algorithm_id: str) -> None:
    if not category or not algorithm_id:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="A registered algorithm is required.")
    # Operating-system lessons are module-gated today; only DSA topics in the
    # shared topic registry are individually billable.
    if not _ALGORITHM_CATEGORY_IDS:
        _algorithm_catalog()
    if category not in _ALGORITHM_CATEGORY_IDS:
        return
    require_feature_access(db, user, algorithm_feature_key(category, algorithm_id))


def canonical_feature_key(feature_key: str) -> str:
    """Map route aliases to the canonical key used by owner policy records."""
    return FEATURE_KEY_ALIASES.get(feature_key, feature_key)


def ensure_feature_catalog(db: Session) -> None:
    """Insert newly registered modules and every topic without overwriting owner choices."""
    existing = {row.feature_key for row in db.query(FeaturePolicy).all()}
    added = False
    algorithms = _algorithm_catalog()
    dynamic_modules = [
        (category, FEATURE_LABELS.get(category, _humanize_key(category)))
        for category in sorted(_ALGORITHM_CATEGORY_IDS)
        if category not in FEATURE_LABELS
    ]
    catalog = list(FEATURE_CATALOG) + dynamic_modules + [(key, label) for key, label, _ in algorithms]
    for key, label in catalog:
        if key not in existing:
            db.add(FeaturePolicy(feature_key=key, label=label, is_premium=False, is_enabled=True))
            added = True
    if added:
        db.flush()
    ensure_default_free_plan(db)


def ensure_default_free_plan(db: Session) -> SubscriptionPlan:
    """Seed the free package and keep it aligned with currently free, enabled features."""
    free_plan = db.query(SubscriptionPlan).filter_by(code="free").first()
    if free_plan is None:
        free_plan = SubscriptionPlan(
            code="free",
            name="Free",
            description="Core learning modules for every enabled account.",
            price_minor=0,
            currency="PKR",
            billing_interval="monthly",
            is_free=True,
            is_active=True,
            is_public=True,
        )
        db.add(free_plan)
        db.flush()
    policies = db.query(FeaturePolicy).all()
    should_include = {
        policy.feature_key
        for policy in policies
        if not policy.is_premium and is_feature_enabled(policy) and not policy.is_archived
    }
    memberships = {
        row.feature_key: row
        for row in db.query(PlanFeature).filter(PlanFeature.plan_id == free_plan.plan_id).all()
    }
    for feature_key in should_include:
        membership = memberships.get(feature_key)
        if membership is None:
            db.add(PlanFeature(plan_id=free_plan.plan_id, feature_key=feature_key, included=True))
        elif not membership.included:
            membership.included = True
    for feature_key, membership in memberships.items():
        if feature_key not in should_include:
            db.delete(membership)
    db.flush()
    return free_plan


def is_feature_enabled(policy: FeaturePolicy, now: datetime | None = None) -> bool:
    """An owner-scheduled pause expires automatically at disabled_until."""
    if policy.is_enabled:
        return True
    if policy.disabled_until is None:
        return False
    return _aware(policy.disabled_until) <= (now or datetime.now(timezone.utc))


def _has_active_plan_feature(db: Session, user_id: int, feature_key: str, now: datetime) -> bool:
    subscriptions = (
        db.query(Subscription)
        .join(PlanFeature, PlanFeature.plan_id == Subscription.plan_id)
        .filter(
            Subscription.user_id == user_id,
            PlanFeature.feature_key == feature_key,
            PlanFeature.included.is_(True),
            Subscription.status.in_(("active", "past_due")),
        )
        .order_by(Subscription.current_period_end.desc().nullslast())
        .all()
    )
    for subscription in subscriptions:
        # Paid access is always time-bounded. A missing period end is corrupt
        # or incomplete billing state and must fail closed instead of becoming
        # an accidental lifetime subscription.
        if not subscription.current_period_end or _aware(subscription.current_period_end) <= now:
            continue
        if subscription.status == "past_due":
            # Keep premium during the five-day recovery window; payment_hold is
            # deliberately excluded so a failed renewal cannot grant forever.
            if not subscription.past_due_since:
                continue
            if now >= _aware(subscription.past_due_since) + timedelta(days=5):
                continue
        plan = db.get(SubscriptionPlan, subscription.plan_id)
        # Retiring a plan stops new purchases, but existing paid periods keep
        # the exact entitlement set they bought until their subscription ends.
        if plan is not None:
            return True
    return False


def has_feature_access(db: Session, user: User, feature_key: str) -> bool:
    """Resolve owner, global policy, explicit override, then paid plan access."""
    feature_key = canonical_feature_key(feature_key)
    if is_provisioned_owner(db, user):
        return True
    policy = db.get(FeaturePolicy, feature_key)
    if policy is None:
        return False
    now = datetime.now(timezone.utc)
    if policy.is_archived or not is_feature_enabled(policy, now):
        return False

    override = db.get(UserFeatureOverride, (user.user_id, feature_key))
    if override is not None:
        if override.expires_at is None or _aware(override.expires_at) > datetime.now(timezone.utc):
            return bool(override.granted)
    if _has_active_plan_feature(db, user.user_id, feature_key, now):
        return True
    # The registry's free/premium flag is authoritative. This also makes a
    # time-limited pause expire correctly without waiting for a worker to
    # rewrite the free plan's membership rows.
    return not policy.is_premium


def require_feature_access(db: Session, user: User, feature_key: str) -> None:
    feature_key = canonical_feature_key(feature_key)
    policy = db.get(FeaturePolicy, feature_key)
    if policy is None:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Unknown learning module.")
    if (policy.is_archived or not is_feature_enabled(policy)) and not is_provisioned_owner(db, user):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="This module is currently disabled for learner accounts.",
        )
    if not has_feature_access(db, user, feature_key):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="This module requires premium access. Contact the STEM Studio owner for access.",
        )


def _aware(value: datetime) -> datetime:
    return value if value.tzinfo else value.replace(tzinfo=timezone.utc)
