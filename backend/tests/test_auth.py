import pytest
from backend.infrastructure.database.models import User


def test_signup_and_login_flow(client, db_session):
    # 1. Signup
    signup_data = {
        "username": "alan_turing",
        "email": "turing@stemstudio.com",
        "password": "UniversalTuringMachine123!",
        "first_name": "Alan",
        "last_name": "Turing",
    }
    signup_res = client.post("/api/auth/signup", json=signup_data)
    assert signup_res.status_code == 201
    user = signup_res.json()
    assert user["username"] == "alan_turing"
    assert user["email"] == "turing@stemstudio.com"

    # 2. Login
    login_data = {
        "email": "turing@stemstudio.com",
        "password": "UniversalTuringMachine123!",
    }
    login_res = client.post("/api/auth/login", json=login_data)
    assert login_res.status_code == 200
    token_data = login_res.json()
    assert "access_token" in token_data
    assert "refresh_token" in token_data

    # 3. Access Protected /me endpoint
    headers = {"Authorization": f"Bearer {token_data['access_token']}"}
    me_res = client.get("/api/auth/me", headers=headers)
    assert me_res.status_code == 200
    me_data = me_res.json()
    assert me_data["username"] == "alan_turing"


def test_login_invalid_password(client, db_session):
    # Signup user
    signup_data = {
        "username": "grace_hopper",
        "email": "hopper@stemstudio.com",
        "password": "CompilerCreator123!",
    }
    client.post("/api/auth/signup", json=signup_data)

    # Attempt login with wrong password
    bad_login = {
        "email": "hopper@stemstudio.com",
        "password": "WrongPassword!",
    }
    res = client.post("/api/auth/login", json=bad_login)
    assert res.status_code == 401
    assert "Invalid email or password" in res.json()["detail"]
