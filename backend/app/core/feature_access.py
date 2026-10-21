"""Central module entitlements shared by owner controls and learner APIs."""

from datetime import datetime, timezone

from fastapi import HTTPException, status
from sqlalchemy.orm import Session

from backend.app.core.owner_security import is_provisioned_owner
from backend.infrastructure.database.models import FeaturePolicy, User, UserFeatureOverride


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


def canonical_feature_key(feature_key: str) -> str:
    """Map route aliases to the canonical key used by owner policy records."""
    return FEATURE_KEY_ALIASES.get(feature_key, feature_key)


def ensure_feature_catalog(db: Session) -> None:
    """Insert newly registered modules without overwriting owner choices."""
    existing = {row[0] for row in db.query(FeaturePolicy.feature_key).all()}
    added = False
    for key, label in FEATURE_CATALOG:
        if key not in existing:
            db.add(FeaturePolicy(feature_key=key, label=label, is_premium=False, is_enabled=True))
            added = True
    if added:
        db.flush()


def has_feature_access(db: Session, user: User, feature_key: str) -> bool:
    """Resolve explicit override first, then global policy; unknown keys fail closed."""
    feature_key = canonical_feature_key(feature_key)
    if is_provisioned_owner(db, user):
        return True
    if feature_key not in FEATURE_LABELS:
        return False

    policy = db.get(FeaturePolicy, feature_key)
    if policy is None:
        return True  # New catalog entries are free until an owner changes their policy.
    if not policy.is_enabled:
        return False

    override = db.get(UserFeatureOverride, (user.user_id, feature_key))
    if override is not None:
        if override.expires_at is None or _aware(override.expires_at) > datetime.now(timezone.utc):
            return bool(override.granted)
    return not policy.is_premium


def require_feature_access(db: Session, user: User, feature_key: str) -> None:
    feature_key = canonical_feature_key(feature_key)
    if feature_key not in FEATURE_LABELS:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Unknown learning module.")
    policy = db.get(FeaturePolicy, feature_key)
    if policy is not None and not policy.is_enabled and not is_provisioned_owner(db, user):
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
