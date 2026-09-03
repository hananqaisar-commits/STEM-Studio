import pytest
from fastapi.testclient import TestClient
from backend.app.main import app
from backend.app.api.routes.octa_tutor import classify_intent, resolve_algorithm_name

client = TestClient(app)

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
    response = client.post("/api/octa-tutor", json=payload)
    assert response.status_code == 200
    data = response.json()
    assert "reply" in data
    assert "function_calls" in data
    assert len(data["function_calls"]) > 0
    assert data["function_calls"][0]["name"] == "navigate_to_algorithm"
    assert data["function_calls"][0]["args"]["category_id"] == "bst"
    assert data["function_calls"][0]["args"]["topic_id"] == "avl"

def test_tutor_playback_intent():
    payload = {
        "message": "pause visualization",
        "algorithm_name": "Merge Sort",
        "current_step_index": 1,
        "total_steps": 5,
    }
    response = client.post("/api/octa-tutor", json=payload)
    assert response.status_code == 200
    data = response.json()
    assert len(data["function_calls"]) > 0
    assert data["function_calls"][0]["name"] == "control_playback"
    assert data["function_calls"][0]["args"]["action"] == "pause"

def test_tutor_connection_test_endpoint():
    payload = {
        "provider": "openai",
        "api_key": "",
        "base_url": "https://api.openai.com/v1",
        "model_name": "gpt-4o-mini"
    }
    response = client.post("/api/octa-tutor/test", json=payload)
    assert response.status_code == 200
    data = response.json()
    assert data["success"] is False
    assert "missing" in data["message"].lower()

def test_tutor_specific_algorithm_quiz_intent():
    payload = {
        "message": "quiz lo mera for Tower of hanoi",
        "algorithm_name": "DSA Concept",
    }
    response = client.post("/api/octa-tutor", json=payload)
    assert response.status_code == 200
    data = response.json()
    assert "Tower of Hanoi" in data["reply"]
    fn_names = [f["name"] for f in data["function_calls"]]
    assert "navigate_to_algorithm" in fn_names
    assert "generate_quiz" in fn_names

def test_tutor_real_world_application_intent():
    payload = {
        "message": "Where is Palindrome Check used in real-world applications?",
        "algorithm_name": "Palindrome Check",
        "category": "strings",
    }
    response = client.post("/api/octa-tutor", json=payload)
    assert response.status_code == 200
    data = response.json()
    assert "Bioinformatics" in data["reply"] or "DNA" in data["reply"]

def test_tutor_roman_urdu_greetings():
    payload = {"message": "kaisa ho?"}
    response = client.post("/api/octa-tutor", json=payload)
    assert response.status_code == 200
    data = response.json()
    assert "theek hoon" in data["reply"].lower() or "kaise hain" in data["reply"].lower()


def test_open_dialogue_teaches_tower_of_hanoi_without_an_api_key():
    response = client.post("/api/octa-tutor", json={
        "message": "Tell me what the algorithm of Tower of Hanoi does",
        "conversation_mode": "dialogue",
        "category": "recursion",
    })
    assert response.status_code == 200
    data = response.json()
    assert "Tower of Hanoi is a recursion puzzle" in data["reply"]
    assert "7 moves" in data["reply"]
    assert data["function_calls"] == []

