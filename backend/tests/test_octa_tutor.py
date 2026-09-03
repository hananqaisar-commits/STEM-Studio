import pytest
from unittest.mock import patch, AsyncMock, MagicMock
from backend.app.main import app
from backend.tests.conftest import ASGITestClient

@pytest.fixture
def test_client(db_session):
    return ASGITestClient(app)

def test_octa_tutor_missing_key_returns_503(test_client):
    """When DASHSCOPE_API_KEY is empty, server should return HTTP 503."""
    with patch("backend.app.api.routes.octa_tutor.get_settings") as mock_settings:
        mock_settings.return_value.DASHSCOPE_API_KEY = ""
        payload = {
            "message": "Explain bubble sort",
            "algorithm_name": "Bubble Sort",
            "algorithm_id": "bubble",
            "category": "sorting",
            "current_step_description": "Comparing elements",
            "current_step_index": 2,
            "total_steps": 10,
        }
        res = test_client.post("/api/octa-tutor", json=payload)
        assert res.status_code == 503
        assert "not configured" in res.json()["detail"].lower()

def test_octa_tutor_successful_mock_response(test_client):
    """Mock successful DashScope Qwen call."""
    mock_dashscope_response = {
        "choices": [
            {
                "message": {
                    "content": "Bubble sort works by repeatedly swapping adjacent elements.",
                    "tool_calls": [
                        {
                            "function": {
                                "name": "switch_theme",
                                "arguments": '{"mode": "dark"}'
                            }
                        }
                    ]
                }
            }
        ]
    }

    mock_resp = MagicMock()
    mock_resp.status_code = 200
    mock_resp.json.return_value = mock_dashscope_response

    with patch("backend.app.api.routes.octa_tutor.get_settings") as mock_settings:
        mock_settings.return_value.DASHSCOPE_API_KEY = "mock-key-12345"
        with patch("httpx.AsyncClient.post", new_callable=AsyncMock) as mock_post:
            mock_post.return_value = mock_resp

            payload = {
                "message": "Switch to dark mode",
                "algorithm_name": "Bubble Sort",
                "algorithm_id": "bubble",
                "category": "sorting",
            }
            res = test_client.post("/api/octa-tutor", json=payload)
            assert res.status_code == 200
            data = res.json()
            assert data["reply"] == "Bubble sort works by repeatedly swapping adjacent elements."
            assert len(data["function_calls"]) == 1
            assert data["function_calls"][0]["name"] == "switch_theme"
            assert data["function_calls"][0]["args"]["mode"] == "dark"
            assert data["mascot_expression"] == "happy"
