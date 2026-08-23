import asyncio
import json
import pytest
from urllib.parse import urlparse
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool

from backend.infrastructure.database.database import Base, get_db
from backend.app.main import app

# In-memory SQLite for testing
SQLALCHEMY_DATABASE_URL = "sqlite:///:memory:"

engine = create_engine(
    SQLALCHEMY_DATABASE_URL,
    connect_args={"check_same_thread": False},
    poolclass=StaticPool,
)
TestingSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)


class ASGIResponse:
    def __init__(self, status_code: int, headers: list, body: bytes):
        self.status_code = status_code
        self.headers = {k.decode("latin1"): v.decode("latin1") for k, v in headers}
        self.body = body

    def json(self):
        return json.loads(self.body.decode("utf-8"))

    @property
    def text(self):
        return self.body.decode("utf-8")


class ASGITestClient:
    def __init__(self, asgi_app):
        self.app = asgi_app

    def _request(self, method: str, url: str, json_data: dict = None, headers: dict = None) -> ASGIResponse:
        parsed = urlparse(url)
        path = parsed.path
        query = parsed.query.encode("ascii")

        body_bytes = json.dumps(json_data).encode("utf-8") if json_data is not None else b""

        raw_headers = [[b"host", b"testserver"]]
        if json_data is not None:
            raw_headers.append([b"content-type", b"application/json"])
        if headers:
            for k, v in headers.items():
                raw_headers.append([k.lower().encode("latin1"), v.encode("latin1")])

        status_code = 500
        response_headers = []
        response_body = []

        async def run():
            nonlocal status_code, response_headers, response_body
            scope = {
                "type": "http",
                "method": method.upper(),
                "path": path,
                "raw_path": path.encode("ascii"),
                "query_string": query,
                "headers": raw_headers,
            }

            has_sent_body = False

            async def receive():
                nonlocal has_sent_body
                if not has_sent_body:
                    has_sent_body = True
                    return {
                        "type": "http.request",
                        "body": body_bytes,
                        "more_body": False,
                    }
                return {"type": "http.request", "body": b"", "more_body": False}

            async def send(message):
                nonlocal status_code, response_headers, response_body
                if message["type"] == "http.response.start":
                    status_code = message["status"]
                    response_headers = message.get("headers", [])
                elif message["type"] == "http.response.body":
                    response_body.append(message.get("body", b""))

            await self.app(scope, receive, send)

        asyncio.run(run())
        return ASGIResponse(status_code, response_headers, b"".join(response_body))

    def get(self, url: str, headers: dict = None) -> ASGIResponse:
        return self._request("GET", url, headers=headers)

    def post(self, url: str, json: dict = None, headers: dict = None) -> ASGIResponse:
        return self._request("POST", url, json_data=json, headers=headers)

    def delete(self, url: str, headers: dict = None) -> ASGIResponse:
        return self._request("DELETE", url, headers=headers)


@pytest.fixture(scope="function")
def db_session():
    """Create a fresh in-memory database for each test function."""
    Base.metadata.create_all(bind=engine)
    db = TestingSessionLocal()
    try:
        yield db
    finally:
        db.close()
        Base.metadata.drop_all(bind=engine)


@pytest.fixture(scope="function")
def client(db_session):
    """Override get_db dependency with test in-memory session."""
    def override_get_db():
        try:
            yield db_session
        finally:
            pass

    app.dependency_overrides[get_db] = override_get_db
    yield ASGITestClient(app)
    app.dependency_overrides.clear()
