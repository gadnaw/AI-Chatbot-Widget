# chatbot-backend/tests/test_main.py
import pytest
from fastapi.testclient import TestClient
from app.main import app


@pytest.fixture
def client():
    return TestClient(app)


def test_health_endpoint(client):
    response = client.get("/health")
    assert response.status_code == 200
    assert response.json()["status"] == "healthy"


def test_docs_available(client):
    response = client.get("/docs")
    assert response.status_code == 200


def test_chat_requires_api_key(client):
    """Test that chat endpoint requires API key authentication."""
    # When header is missing, FastAPI returns 422 (validation error)
    # This is acceptable - the endpoint rejects requests without API key
    response = client.post("/api/v1/chat", json={"message": "hello"})
    assert response.status_code in [401, 422]


def test_chat_with_invalid_api_key(client):
    """Test that chat endpoint rejects invalid API keys."""
    response = client.post(
        "/api/v1/chat", json={"message": "hello"}, headers={"X-API-Key": "invalid_key"}
    )
    # Invalid API key returns 401
    assert response.status_code == 401


def test_widget_endpoint(client):
    """Test that widget endpoint serves HTML."""
    response = client.get("/widget/test-widget-id")
    assert response.status_code == 200
    assert "text/html" in response.headers["content-type"]
    assert "ai-chat-widget" in response.text
    assert "INIT" in response.text
