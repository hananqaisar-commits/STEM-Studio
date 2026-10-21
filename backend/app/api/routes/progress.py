import json
from pathlib import Path
from collections import defaultdict
from datetime import datetime, timezone, timedelta
from typing import List

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from backend.app.api.dependencies import get_current_user
from backend.app.core.feature_access import FEATURE_CATALOG, has_feature_access, require_algorithm_access, require_feature_access
from backend.app.api.schemas import (
    CompleteAlgorithmRequest,
    MessageResponse,
    ModuleProgressResponse,
    QuizSubmissionRequest,
    QuizSubmissionResponse,
    SaveSessionRequest,
    SavedSessionResponse,
    UserStatsResponse,
)
from backend.infrastructure.database.database import get_db
from backend.infrastructure.database.models import (
    ModuleProgress,
    QuizAttempt,
    SavedSession,
    User,
    UserStreak,
)

router = APIRouter(prefix="/api/progress", tags=["User Progress & Quizzes"])

_TOPIC_CATALOG_PATH = Path(__file__).resolve().parents[4] / "frontend/src/data/topicCatalog.json"
with _TOPIC_CATALOG_PATH.open(encoding="utf-8") as _topic_catalog_file:
    MODULE_ALGORITHM_COUNTS = {module: len(topic_ids) for module, topic_ids in json.load(_topic_catalog_file).items()}


def _available_module_names(db: Session, current_user: User) -> list[str]:
    available = [
        key for key, _ in FEATURE_CATALOG
        if has_feature_access(db, current_user, key)
    ]
    available.extend(
        alias for canonical, alias in (("os-commands", "commands"), ("os-filesystem", "filesystem"))
        if canonical in available
    )
    return available


# ─── 1. SUBMIT QUIZ ANSWER ───────────────────────────────────────────

@router.post("/quiz-submit", response_model=QuizSubmissionResponse)
def submit_quiz(
    payload: QuizSubmissionRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Record a quiz attempt and update user learning streak."""
    require_feature_access(db, current_user, payload.module_name)
    require_algorithm_access(db, current_user, payload.module_name, payload.algorithm_id)
    # 1. Record Attempt
    attempt = QuizAttempt(
        user_id=current_user.user_id,
        module_name=payload.module_name,
        algorithm_id=payload.algorithm_id,
        question_prompt=payload.question_prompt,
        selected_option=payload.selected_option,
        is_correct=payload.is_correct,
    )
    db.add(attempt)

    # 2. Update Streak
    streak = db.query(UserStreak).filter(UserStreak.user_id == current_user.user_id).first()
    now_utc = datetime.now(timezone.utc)

    if streak is None:
        streak = UserStreak(
            user_id=current_user.user_id,
            current_streak=1,
            highest_streak=1,
            last_active_date=now_utc,
        )
        db.add(streak)
    else:
        # Check date difference
        last_date = streak.last_active_date.date()
        today = now_utc.date()

        if today > last_date:
            if (today - last_date).days == 1:
                streak.current_streak += 1
                if streak.current_streak > streak.highest_streak:
                    streak.highest_streak = streak.current_streak
            else:
                streak.current_streak = 1
            streak.last_active_date = now_utc

    db.commit()

    # 3. Compute stats
    total_attempts = (
        db.query(QuizAttempt).filter(QuizAttempt.user_id == current_user.user_id).count()
    )
    correct_attempts = (
        db.query(QuizAttempt)
        .filter(
            QuizAttempt.user_id == current_user.user_id,
            QuizAttempt.is_correct == True,
        )
        .count()
    )
    accuracy = (correct_attempts / total_attempts * 100) if total_attempts > 0 else 0.0

    return QuizSubmissionResponse(
        attempt_id=attempt.attempt_id,
        is_correct=payload.is_correct,
        total_quizzes_taken=total_attempts,
        accuracy_percentage=round(accuracy, 1),
        current_streak=streak.current_streak,
        message="Quiz attempt recorded successfully!",
    )


# ─── 2. COMPLETE ALGORITHM ───────────────────────────────────────────

@router.post("/complete-algorithm", response_model=ModuleProgressResponse)
def complete_algorithm(
    payload: CompleteAlgorithmRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Mark an algorithm as completed/mastered within a module."""
    require_feature_access(db, current_user, payload.module_name)
    require_algorithm_access(db, current_user, payload.module_name, payload.algorithm_id)
    progress = (
        db.query(ModuleProgress)
        .filter(
            ModuleProgress.user_id == current_user.user_id,
            ModuleProgress.module_name == payload.module_name,
        )
        .first()
    )

    if progress is None:
        completed = [payload.algorithm_id]
        total_expected = MODULE_ALGORITHM_COUNTS.get(payload.module_name, 6)
        pct = min(100, int(len(completed) / total_expected * 100))

        progress = ModuleProgress(
            user_id=current_user.user_id,
            module_name=payload.module_name,
            completed_algorithms=json.dumps(completed),
            completion_percentage=pct,
        )
        db.add(progress)
    else:
        try:
            completed = json.loads(progress.completed_algorithms)
        except Exception:
            completed = []

        if payload.algorithm_id not in completed:
            completed.append(payload.algorithm_id)
            total_expected = MODULE_ALGORITHM_COUNTS.get(payload.module_name, 6)
            pct = min(100, int(len(completed) / total_expected * 100))

            progress.completed_algorithms = json.dumps(completed)
            progress.completion_percentage = pct

    db.commit()
    db.refresh(progress)

    return ModuleProgressResponse(
        module_name=progress.module_name,
        completed_algorithms=json.loads(progress.completed_algorithms),
        completion_percentage=progress.completion_percentage,
        updated_at=progress.updated_at,
    )


# ─── 3. GET USER OVERALL STATS ───────────────────────────────────────

@router.get("/stats", response_model=UserStatsResponse)
def get_user_stats(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Return total quizzes taken, accuracy, streak, and module completion stats."""
    available_module_names = _available_module_names(db, current_user)
    total_quizzes = db.query(QuizAttempt).filter(
        QuizAttempt.user_id == current_user.user_id,
        QuizAttempt.module_name.in_(available_module_names),
    ).count()
    correct_quizzes = db.query(QuizAttempt).filter(
        QuizAttempt.user_id == current_user.user_id,
        QuizAttempt.module_name.in_(available_module_names),
        QuizAttempt.is_correct.is_(True),
    ).count()
    accuracy = (correct_quizzes / total_quizzes * 100) if total_quizzes > 0 else 0.0

    streak = db.query(UserStreak).filter(UserStreak.user_id == current_user.user_id).first()
    curr_streak = streak.current_streak if streak else 0
    highest_streak = streak.highest_streak if streak else 0

    # Fetch module progress
    module_rows = (
        db.query(ModuleProgress)
        .filter(ModuleProgress.user_id == current_user.user_id)
        .filter(ModuleProgress.module_name.in_(available_module_names))
        .all()
    )

    modules_data = []
    for m in module_rows:
        try:
            completed_list = json.loads(m.completed_algorithms)
        except Exception:
            completed_list = []

        modules_data.append(
            ModuleProgressResponse(
                module_name=m.module_name,
                completed_algorithms=completed_list,
                completion_percentage=m.completion_percentage,
                updated_at=m.updated_at,
            )
        )

    return UserStatsResponse(
        total_quizzes=total_quizzes,
        correct_quizzes=correct_quizzes,
        accuracy_percentage=round(accuracy, 1),
        current_streak=curr_streak,
        highest_streak=highest_streak,
        modules=modules_data,
    )


@router.get("/review-schedule")
def get_review_schedule(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Return due topics using accuracy-based 1 / 3 / 7 day intervals."""
    attempts = (
        db.query(QuizAttempt)
        .filter(QuizAttempt.user_id == current_user.user_id)
        .filter(QuizAttempt.module_name.in_(_available_module_names(db, current_user)))
        .order_by(QuizAttempt.created_at.asc())
        .all()
    )
    grouped: dict[tuple[str, str], list[QuizAttempt]] = defaultdict(list)
    for attempt in attempts:
        grouped[(attempt.module_name, attempt.algorithm_id)].append(attempt)

    now = datetime.now(timezone.utc)
    due_topics = []
    for (module_name, algorithm_id), rows in grouped.items():
        recent = rows[-5:]
        accuracy = sum(1 for row in recent if row.is_correct) / len(recent)
        interval_days = 1 if accuracy < 0.6 else 3 if accuracy < 0.8 else 7
        last_attempt = rows[-1].created_at
        if last_attempt.tzinfo is None:
            last_attempt = last_attempt.replace(tzinfo=timezone.utc)
        due_at = last_attempt + timedelta(days=interval_days)
        if due_at <= now:
            due_topics.append({
                "module_name": module_name,
                "algorithm_id": algorithm_id,
                "accuracy_percentage": round(accuracy * 100),
                "interval_days": interval_days,
                "last_attempt_at": last_attempt,
                "due_at": due_at,
            })
    due_topics.sort(key=lambda item: item["due_at"])
    return {"due_count": len(due_topics), "due_topics": due_topics[:20]}


# ─── 4. SAVED SESSIONS (CUSTOM DATASETS & BOOKMARKS) ────────────────

@router.post("/sessions", response_model=SavedSessionResponse, status_code=status.HTTP_201_CREATED)
def save_session(
    payload: SaveSessionRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Save a user visualization state or custom dataset."""
    require_feature_access(db, current_user, payload.module_name)
    new_session = SavedSession(
        user_id=current_user.user_id,
        title=payload.title,
        module_name=payload.module_name,
        algorithm_id=payload.algorithm_id,
        dataset_json=payload.dataset_json,
    )
    db.add(new_session)
    db.commit()
    db.refresh(new_session)
    return new_session


@router.get("/sessions", response_model=List[SavedSessionResponse])
def get_user_sessions(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Retrieve all saved datasets and states for the current user."""
    available_module_names = _available_module_names(db, current_user)
    sessions = (
        db.query(SavedSession)
        .filter(SavedSession.user_id == current_user.user_id)
        .filter(SavedSession.module_name.in_(available_module_names))
        .order_by(SavedSession.created_at.desc())
        .all()
    )
    return sessions


@router.delete("/sessions/{session_id}", response_model=MessageResponse)
def delete_session(
    session_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Delete a saved session."""
    session = (
        db.query(SavedSession)
        .filter(
            SavedSession.session_id == session_id,
            SavedSession.user_id == current_user.user_id,
        )
        .first()
    )

    if not session:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Session not found",
        )

    db.delete(session)
    db.commit()
    return MessageResponse(message="Session deleted successfully")
