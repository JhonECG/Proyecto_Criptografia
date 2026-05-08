"""Backend API tests for Kript zero-knowledge password manager."""
import os
import time
import pytest
import requests

BASE_URL = os.environ.get("REACT_APP_BACKEND_URL", "https://design-preview-180.preview.emergentagent.com").rstrip("/")
API = f"{BASE_URL}/api"

ADMIN_EMAIL = "admin@kript.app"
ADMIN_PASSWORD = "admin123"


@pytest.fixture(scope="module")
def admin_session():
    s = requests.Session()
    r = s.post(f"{API}/auth/login", json={"email": ADMIN_EMAIL, "password": ADMIN_PASSWORD})
    assert r.status_code == 200, f"admin login failed: {r.status_code} {r.text}"
    return s


@pytest.fixture(scope="module")
def new_user():
    email = f"test+{int(time.time()*1000)}@example.com"
    pwd = "Passw0rd!"
    s = requests.Session()
    r = s.post(f"{API}/auth/register", json={"email": email, "password": pwd, "name": "Tester"})
    assert r.status_code == 200, f"register failed: {r.status_code} {r.text}"
    body = r.json()
    return {"session": s, "email": email, "password": pwd, "id": body["id"]}


# ---------- Health ----------
def test_root_health():
    r = requests.get(f"{API}/")
    assert r.status_code == 200
    data = r.json()
    assert data.get("service") == "kript"
    assert data.get("status") == "ok"


# ---------- Auth ----------
def test_register_sets_cookies_and_returns_user(new_user):
    s = new_user["session"]
    cookies = s.cookies.get_dict()
    assert "access_token" in cookies
    assert "refresh_token" in cookies


def test_register_duplicate_email_returns_400(new_user):
    r = requests.post(f"{API}/auth/register", json={"email": new_user["email"], "password": "Passw0rd!"})
    assert r.status_code == 400
    assert "registrado" in r.json().get("detail", "").lower()


def test_login_admin_success(admin_session):
    cookies = admin_session.cookies.get_dict()
    assert "access_token" in cookies


def test_login_wrong_password_spanish_error():
    r = requests.post(f"{API}/auth/login", json={"email": ADMIN_EMAIL, "password": "wrong"})
    assert r.status_code == 401
    assert r.json().get("detail") == "Credenciales inválidas"


def test_me_with_cookie(admin_session):
    r = admin_session.get(f"{API}/auth/me")
    assert r.status_code == 200
    assert r.json()["email"] == ADMIN_EMAIL
    assert "_id" not in r.json()


def test_me_with_bearer():
    # Login fresh to get token via cookie, then send same as Bearer
    s = requests.Session()
    r = s.post(f"{API}/auth/login", json={"email": ADMIN_EMAIL, "password": ADMIN_PASSWORD})
    assert r.status_code == 200
    token = s.cookies.get("access_token")
    assert token
    r2 = requests.get(f"{API}/auth/me", headers={"Authorization": f"Bearer {token}"})
    assert r2.status_code == 200
    assert r2.json()["email"] == ADMIN_EMAIL


def test_me_unauthenticated():
    r = requests.get(f"{API}/auth/me")
    assert r.status_code == 401


def test_logout_clears_cookies():
    s = requests.Session()
    s.post(f"{API}/auth/login", json={"email": ADMIN_EMAIL, "password": ADMIN_PASSWORD})
    r = s.post(f"{API}/auth/logout")
    assert r.status_code == 200
    # After logout, /me should fail (cookies cleared)
    r2 = s.get(f"{API}/auth/me")
    assert r2.status_code == 401


# ---------- Credentials CRUD ----------
def test_credentials_requires_auth():
    r = requests.get(f"{API}/credentials")
    assert r.status_code == 401


def test_credentials_crud_flow(new_user):
    s = new_user["session"]
    # CREATE
    payload = {"name": "TEST_GitHub", "username": "u@x.com", "password": "p", "url": "https://github.com",
               "notes": "n", "category": "dev", "favorite": False}
    r = s.post(f"{API}/credentials", json=payload)
    assert r.status_code == 200, r.text
    cred = r.json()
    cid = cred["id"]
    assert cred["name"] == "TEST_GitHub"
    assert "_id" not in cred

    # LIST
    r = s.get(f"{API}/credentials")
    assert r.status_code == 200
    items = r.json()
    assert any(c["id"] == cid for c in items)

    # UPDATE
    upd = {**payload, "name": "TEST_GitHub2", "favorite": True}
    r = s.put(f"{API}/credentials/{cid}", json=upd)
    assert r.status_code == 200
    assert r.json()["name"] == "TEST_GitHub2"
    assert r.json()["favorite"] is True

    # GET to verify persistence
    r = s.get(f"{API}/credentials")
    found = [c for c in r.json() if c["id"] == cid][0]
    assert found["name"] == "TEST_GitHub2"
    assert found["favorite"] is True

    # DELETE
    r = s.delete(f"{API}/credentials/{cid}")
    assert r.status_code == 200

    # 404 on second delete
    r = s.delete(f"{API}/credentials/{cid}")
    assert r.status_code == 404


def test_credentials_isolation_between_users(new_user, admin_session):
    # Create credential as new_user
    s = new_user["session"]
    r = s.post(f"{API}/credentials", json={"name": "TEST_iso", "password": "x"})
    cid = r.json()["id"]

    # Admin should not see or be able to delete it
    r = admin_session.get(f"{API}/credentials")
    assert all(c["id"] != cid for c in r.json())

    r = admin_session.delete(f"{API}/credentials/{cid}")
    assert r.status_code == 404

    # Cleanup
    s.delete(f"{API}/credentials/{cid}")


# ---------- Generator ----------
def test_generator_default_length():
    r = requests.post(f"{API}/generator", json={"length": 20, "uppercase": True, "lowercase": True,
                                                "numbers": True, "symbols": True})
    assert r.status_code == 200
    body = r.json()
    assert body["length"] == 20
    assert len(body["password"]) == 20


def test_generator_only_lowercase():
    r = requests.post(f"{API}/generator", json={"length": 12, "uppercase": False, "lowercase": True,
                                                "numbers": False, "symbols": False})
    assert r.status_code == 200
    pwd = r.json()["password"]
    assert len(pwd) == 12
    assert pwd.islower() and pwd.isalpha()


def test_generator_no_charset_returns_400():
    r = requests.post(f"{API}/generator", json={"length": 12, "uppercase": False, "lowercase": False,
                                                "numbers": False, "symbols": False})
    assert r.status_code == 400
