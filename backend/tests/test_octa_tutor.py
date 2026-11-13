import asyncio
from types import SimpleNamespace

import pytest
from starlette.requests import Request
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool

from backend.app.api.routes import octa_tutor as octa_tutor_module
from backend.app.api.routes.octa_tutor import classify_intent, resolve_algorithm_name
from backend.app.api.schemas import (
    OctaTutorRequest,
    OctaTutorTestRequest,
    OctaTutorConfigRequest,
    OctaTutorFeedbackRequest,
    OctaTutorPreferenceRequest,
)
from backend.app.core.user_llm_credentials import decrypt_user_api_key, validate_provider_endpoint
from backend.infrastructure.database.database import Base
from backend.infrastructure.database.models import FeaturePolicy, QuizAttempt, TutorLearningProfile, User, UserLLMConfig

test_engine = create_engine(
    "sqlite:///:memory:", connect_args={"check_same_thread": False}, poolclass=StaticPool
)
TestSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=test_engine)
Base.metadata.create_all(bind=test_engine)
test_user = SimpleNamespace(user_id=9001, roles=[])
test_db = TestSessionLocal()
test_db.add(User(user_id=9001, username="octa-test-user", email="octa-test@example.invalid", password_hash="test-only"))
test_db.add(FeaturePolicy(feature_key="sorting", label="Sorting Algorithms", is_premium=False, is_enabled=True))
test_db.add(FeaturePolicy(feature_key="strings", label="Strings", is_premium=False, is_enabled=True))
test_db.commit()
test_db.close()

# Keep these unit tests deterministic and avoid contacting a real LLM provider.
octa_tutor_module.resolve_llm_config = lambda *_args: ("", "", "test-model", "openai")
octa_tutor_module.tutor_rate_limiter.is_allowed = lambda _key: True


def _request() -> Request:
    return Request({
        "type": "http",
        "asgi": {"version": "3.0", "spec_version": "2.3"},
        "http_version": "1.1",
        "method": "POST",
        "scheme": "http",
        "path": "/api/octa-tutor",
        "raw_path": b"/api/octa-tutor",
        "query_string": b"",
        "headers": [],
        "client": ("testclient", 50000),
        "server": ("testserver", 80),
        "root_path": "",
    })


def _call_tutor(payload: dict):
    db = TestSessionLocal()
    try:
        return asyncio.run(octa_tutor_module.handle_octa_tutor(OctaTutorRequest(**payload), _request(), test_user, db))
    finally:
        db.close()


@pytest.fixture(autouse=True)
def clean_learning_state():
    db = TestSessionLocal()
    db.query(TutorLearningProfile).filter(TutorLearningProfile.user_id == test_user.user_id).delete()
    db.query(QuizAttempt).filter(QuizAttempt.user_id == test_user.user_id).delete()
    db.query(UserLLMConfig).filter(UserLLMConfig.user_id == test_user.user_id).delete()
    db.commit()
    db.close()

def test_classify_intent():
    assert classify_intent("open AVL tree") == "navigate"
    assert classify_intent("show me graphs") == "navigate"
    assert classify_intent("play the visualization") == "playback"
    assert classify_intent("pause please") == "playback"
    assert classify_intent("slow down") == "speed"
    assert classify_intent("too fast") == "speed"
    assert classify_intent("dark mode") == "theme"
    assert classify_intent("hide code panel") == "debugger"
    assert classify_intent("go fullscreen") == "fullscreen"
    assert classify_intent("test me with a quiz") == "quiz"
    assert classify_intent("how do I connect my API?") == "api_help"
    assert classify_intent("what should I learn next?") == "recommend"

def test_resolve_algorithm_name():
    assert resolve_algorithm_name("avl") == ("bst", "avl")
    assert resolve_algorithm_name("open AVL tree") == ("bst", "avl")
    assert resolve_algorithm_name("dijkstra's algorithm") == ("graph", "dijkstra")
    assert resolve_algorithm_name("bubble sort") == ("sorting", "bubble")
    assert resolve_algorithm_name("kadane's") == ("arrays", "kadane")
    assert resolve_algorithm_name("hanoi") == ("recursion", "towerOfHanoi")

def test_tutor_fallback_endpoint():
    payload = {
        "message": "open AVL tree",
        "algorithm_name": "Bubble Sort",
        "algorithm_id": "bubble",
        "category": "sorting",
        "current_step_description": "Comparing elements 4 and 2",
        "current_step_index": 2,
        "total_steps": 10,
    }
    data = _call_tutor(payload)
    assert data.reply
    assert data.function_calls
    assert data.function_calls[0].name == "navigate_to_algorithm"
    assert data.function_calls[0].args["category_id"] == "bst"
    assert data.function_calls[0].args["topic_id"] == "avl"

def test_tutor_playback_intent():
    payload = {
        "message": "pause visualization",
        "algorithm_name": "Merge Sort",
        "current_step_index": 1,
        "total_steps": 5,
        "mode": "interactive",
    }
    data = _call_tutor(payload)
    assert data.function_calls
    assert data.function_calls[0].name == "control_playback"
    assert data.function_calls[0].args["action"] == "pause"

def test_tutor_connection_test_endpoint():
    payload = {
        "provider": "openai",
        "api_key": "",
        "base_url": "https://api.openai.com/v1",
        "model_name": "gpt-4o-mini"
    }
    db = TestSessionLocal()
    data = asyncio.run(octa_tutor_module.test_octa_tutor_connection(
        OctaTutorTestRequest(**payload), _request(), test_user, db
    ))
    db.close()
    assert data.success is False
    assert "missing" in data.message.lower()


def test_saved_octa_key_is_encrypted_and_isolated_per_account(monkeypatch):
    monkeypatch.setattr(
        octa_tutor_module,
        "resolve_llm_config",
        lambda provider, key, base_url, model: (base_url, key, model or "test-model", provider),
    )
    db = TestSessionLocal()
    second_user = User(
        user_id=9002,
        username="octa-test-other-user",
        email="octa-test-other@example.invalid",
        password_hash="test-only",
    )
    db.add(second_user)
    db.commit()

    saved = octa_tutor_module.save_octa_tutor_config(
        OctaTutorConfigRequest(
            provider="openai",
            api_key="sk-test-account-secret",
            base_url="https://api.openai.com/v1/chat/completions",
            model_name="gpt-4o-mini",
        ),
        test_user,
        db,
    )
    row = db.get(UserLLMConfig, test_user.user_id)
    assert saved.api_key_configured is True
    assert "sk-test-account-secret" not in str(saved.model_dump())
    assert row is not None
    assert row.encrypted_api_key != "sk-test-account-secret"
    assert decrypt_user_api_key(row.encrypted_api_key) == "sk-test-account-secret"

    other_user_config = octa_tutor_module.get_octa_tutor_config(second_user, db)
    assert other_user_config.api_key_configured is False
    assert other_user_config.provider == "dashscope"

    changed_provider = octa_tutor_module.save_octa_tutor_config(
        OctaTutorConfigRequest(
            provider="openrouter",
            base_url="https://openrouter.ai/api/v1/chat/completions",
            model_name="openai/gpt-4o-mini",
        ),
        test_user,
        db,
    )
    assert changed_provider.api_key_configured is False
    assert db.get(UserLLMConfig, test_user.user_id).encrypted_api_key is None

    reset = octa_tutor_module.reset_octa_tutor_config(test_user, db)
    assert reset.provider == "dashscope"
    assert db.get(UserLLMConfig, test_user.user_id) is None
    db.delete(second_user)
    db.commit()
    db.close()


def test_provider_endpoint_rejects_plain_http_and_spoofed_provider_hosts():
    with pytest.raises(ValueError, match="HTTPS"):
        validate_provider_endpoint("openai", "http://api.openai.com/v1/chat/completions", debug=False)
    with pytest.raises(ValueError, match="official"):
        validate_provider_endpoint("openai", "https://attacker.example/v1/chat/completions", debug=False)
    with pytest.raises(ValueError, match="Private and local"):
        validate_provider_endpoint("custom", "https://127.0.0.1:11434/v1/chat/completions", debug=False)


def test_custom_provider_rejects_private_dns_results(monkeypatch):
    monkeypatch.setattr(
        "backend.app.core.user_llm_credentials.socket.getaddrinfo",
        lambda *_args, **_kwargs: [
            (2, 1, 6, "", ("10.0.0.12", 443)),
        ],
    )
    with pytest.raises(ValueError, match="public IP"):
        validate_provider_endpoint("custom", "https://api.example.com/v1/chat/completions", debug=False)

def test_tutor_specific_algorithm_quiz_intent():
    payload = {
        "message": "quiz lo mera for Tower of hanoi",
        "algorithm_name": "DSA Concept",
        "mode": "interactive",
    }
    data = _call_tutor(payload)
    assert "Tower of Hanoi" in data.reply
    fn_names = [f.name for f in data.function_calls]
    assert "navigate_to_algorithm" in fn_names
    assert fn_names == ["navigate_to_algorithm"]

def test_tutor_real_world_application_intent():
    payload = {
        "message": "Where is Palindrome Check used in real-world applications?",
        "algorithm_name": "Palindrome Check",
        "category": "strings",
    }
    data = _call_tutor(payload)
    assert "Bioinformatics" in data.reply or "DNA" in data.reply

def test_tutor_roman_urdu_greetings():
    payload = {"message": "kaisa ho?"}
    data = _call_tutor(payload)
    assert "theek hoon" in data.reply.lower() or "kaise hain" in data.reply.lower()


def test_learning_profile_uses_quiz_trends_and_explicit_feedback():
    db = TestSessionLocal()
    for algorithm_id, results in (("bubble", (True, True, True, False, False, False)), ("insertion", (True, True, True))):
        for is_correct in results:
            db.add(QuizAttempt(
                user_id=test_user.user_id,
                module_name="sorting",
                algorithm_id=algorithm_id,
                question_prompt="test question",
                selected_option="test option",
                is_correct=is_correct,
            ))
    db.commit()

    profile = octa_tutor_module.get_tutor_learning_profile(test_user, db)
    assert profile["strengths"][0]["algorithm_id"] == "insertion"
    assert profile["practice_areas"][0]["algorithm_id"] == "bubble"
    assert profile["quiz_signals_used"] == 9

    feedback = octa_tutor_module.submit_tutor_feedback(
        OctaTutorFeedbackRequest(
            helpful=False,
            response_style="stepwise",
        ),
        test_user,
        db,
    )
    assert feedback["response_style"] == "stepwise"
    assert feedback["needs_detail_count"] == 1

    updated = octa_tutor_module.update_tutor_learning_profile(OctaTutorPreferenceRequest(response_style="simpler"), test_user, db)
    assert updated["response_style"] == "simpler"

    cleared = octa_tutor_module.clear_tutor_feedback_profile(test_user, db)
    assert cleared["response_style"] == "balanced"
    assert cleared["needs_detail_count"] == 0
    assert cleared["practice_areas"][0]["algorithm_id"] == "bubble"
    db.close()
