import pytest
from backend.app.core.security import hash_password, create_access_token
from backend.infrastructure.database.models import User


def create_test_user(db_session) -> tuple[User, str]:
    """Helper to create a test user and generate an access token."""
    user = User(
        username="teststudent",
        email="student@stemstudio.com",
        password_hash=hash_password("SecurePassword123!"),
        first_name="Ada",
        last_name="Lovelace",
        is_active=True,
    )
    db_session.add(user)
    db_session.commit()
    db_session.refresh(user)

    token = create_access_token(user_id=user.user_id, email=user.email)
    return user, token


def test_submit_quiz_and_streak(client, db_session):
    user, token = create_test_user(db_session)
    headers = {"Authorization": f"Bearer {token}"}

    payload = {
        "module_name": "sorting",
        "algorithm_id": "bubbleSort",
        "question_prompt": "What is the worst-case time complexity of Bubble Sort?",
        "selected_option": "O(N^2)",
        "is_correct": True,
    }

    response = client.post("/api/progress/quiz-submit", json=payload, headers=headers)
    assert response.status_code == 200
    data = response.json()
    assert data["is_correct"] is True
    assert data["total_quizzes_taken"] == 1
    assert data["accuracy_percentage"] == 100.0
    assert data["current_streak"] == 1


def test_complete_algorithm_progress(client, db_session):
    user, token = create_test_user(db_session)
    headers = {"Authorization": f"Bearer {token}"}

    payload = {
        "module_name": "sorting",
        "algorithm_id": "quickSort",
    }

    response = client.post("/api/progress/complete-algorithm", json=payload, headers=headers)
    assert response.status_code == 200
    data = response.json()
    assert data["module_name"] == "sorting"
    assert "quickSort" in data["completed_algorithms"]
    assert data["completion_percentage"] > 0


def test_get_user_stats(client, db_session):
    user, token = create_test_user(db_session)
    headers = {"Authorization": f"Bearer {token}"}

    # Submit 2 quizzes: 1 correct, 1 incorrect
    client.post(
        "/api/progress/quiz-submit",
        json={
            "module_name": "bst",
            "algorithm_id": "insert",
            "question_prompt": "Which subtree?",
            "selected_option": "Left",
            "is_correct": True,
        },
        headers=headers,
    )

    client.post(
        "/api/progress/quiz-submit",
        json={
            "module_name": "bst",
            "algorithm_id": "delete",
            "question_prompt": "Which successor?",
            "selected_option": "Root",
            "is_correct": False,
        },
        headers=headers,
    )

    response = client.get("/api/progress/stats", headers=headers)
    assert response.status_code == 200
    stats = response.json()
    assert stats["total_quizzes"] == 2
    assert stats["correct_quizzes"] == 1
    assert stats["accuracy_percentage"] == 50.0
    assert stats["current_streak"] >= 1


def test_save_and_delete_session(client, db_session):
    user, token = create_test_user(db_session)
    headers = {"Authorization": f"Bearer {token}"}

    # 1. Save Session
    save_payload = {
        "title": "Custom Graph Experiment",
        "module_name": "graph",
        "algorithm_id": "dijkstra",
        "dataset_json": '{"nodes": ["A", "B", "C"], "edges": [{"from": "A", "to": "B", "weight": 5}]}',
    }

    res_save = client.post("/api/progress/sessions", json=save_payload, headers=headers)
    assert res_save.status_code == 201
    session_data = res_save.json()
    assert session_data["title"] == "Custom Graph Experiment"
    session_id = session_data["session_id"]

    # 2. List Sessions
    res_list = client.get("/api/progress/sessions", headers=headers)
    assert res_list.status_code == 200
    assert len(res_list.json()) == 1

    # 3. Delete Session
    res_del = client.delete(f"/api/progress/sessions/{session_id}", headers=headers)
    assert res_del.status_code == 200
    assert res_del.json()["success"] is True

    # 4. Verify list is now empty
    res_list_after = client.get("/api/progress/sessions", headers=headers)
    assert len(res_list_after.json()) == 0
