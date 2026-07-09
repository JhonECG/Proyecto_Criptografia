"""Backend API tests for Kript zero-knowledge password manager.

Cubre auth (registro/login/refresh/logout) y versionado optimista del vault
(sección 10 del PRD: "tests básicos de versionado y auth").
"""
import base64
import hashlib
import os
import time

import pytest
import requests

BASE_URL = os.environ.get("REACT_APP_BACKEND_URL", "http://localhost:8000").rstrip("/")
API = f"{BASE_URL}/api"


def _auth_hash_for(password: str) -> str:
    """Simula el auth_hash que en producción deriva el KDF en el cliente."""
    return hashlib.sha256(password.encode()).hexdigest()


def _fake_ciphertext(text: str) -> str:
    return base64.b64encode(text.encode()).decode()


@pytest.fixture
def registered_user():
    username = f"test_{int(time.time() * 1000)}"
    auth_hash = _auth_hash_for("Passw0rd!Passw0rd!")
    s = requests.Session()
    r = s.post(f"{API}/auth/register", json={"username": username, "auth_hash": auth_hash})
    assert r.status_code == 200, f"register failed: {r.status_code} {r.text}"
    body = r.json()
    return {"session": s, "username": username, "auth_hash": auth_hash, "id": body["id"]}


# ---------- Health ----------
def test_root_health():
    r = requests.get(f"{API}/")
    assert r.status_code == 200
    data = r.json()
    assert data.get("service") == "kript"
    assert data.get("status") == "ok"


# ---------- Auth ----------
def test_register_sets_cookies_and_returns_user(registered_user):
    s = registered_user["session"]
    cookies = s.cookies.get_dict()
    assert "access_token" in cookies
    assert "refresh_token" in cookies


def test_register_duplicate_username_returns_400(registered_user):
    r = requests.post(
        f"{API}/auth/register",
        json={"username": registered_user["username"], "auth_hash": registered_user["auth_hash"]},
    )
    assert r.status_code == 400
    assert "registrado" in r.json().get("detail", "").lower()


def test_login_success(registered_user):
    s = requests.Session()
    r = s.post(
        f"{API}/auth/login",
        json={"username": registered_user["username"], "auth_hash": registered_user["auth_hash"]},
    )
    assert r.status_code == 200
    assert "access_token" in s.cookies.get_dict()


def test_login_wrong_auth_hash_generic_error(registered_user):
    r = requests.post(
        f"{API}/auth/login",
        json={"username": registered_user["username"], "auth_hash": _auth_hash_for("wrong")},
    )
    assert r.status_code == 401
    assert r.json().get("detail") == "Credenciales inválidas"


def test_login_unknown_username_same_generic_error():
    r = requests.post(
        f"{API}/auth/login",
        json={"username": "no-existe-nunca", "auth_hash": _auth_hash_for("whatever")},
    )
    assert r.status_code == 401
    assert r.json().get("detail") == "Credenciales inválidas"


def test_refresh_rotates_token(registered_user):
    s = registered_user["session"]
    old_refresh = s.cookies.get("refresh_token")
    r = s.post(f"{API}/auth/refresh")
    assert r.status_code == 200
    new_refresh = s.cookies.get("refresh_token")
    assert new_refresh != old_refresh

    # El refresh token viejo ya fue revocado al rotar — reusarlo debe fallar.
    old_session = requests.Session()
    old_session.cookies.set("refresh_token", old_refresh)
    r2 = old_session.post(f"{API}/auth/refresh")
    assert r2.status_code == 401


def test_logout_revokes_refresh_and_clears_cookies(registered_user):
    s = registered_user["session"]
    r = s.post(f"{API}/auth/logout")
    assert r.status_code == 200
    assert "access_token" not in s.cookies.get_dict()

    r2 = s.get(f"{API}/vault")
    assert r2.status_code == 401


# ---------- Vault (blob cifrado + versionado optimista) ----------
def test_vault_requires_auth():
    r = requests.get(f"{API}/vault")
    assert r.status_code == 401


def test_vault_get_before_creation_returns_404(registered_user):
    s = registered_user["session"]
    r = s.get(f"{API}/vault")
    assert r.status_code == 404


def test_vault_put_create_and_versioning_flow(registered_user):
    s = registered_user["session"]

    # Creación inicial: version esperada = 0 (no hay blob todavía)
    blob_v1 = _fake_ciphertext("vault-v1")
    r = s.put(f"{API}/vault", json={"ciphertext": blob_v1, "version": 0})
    assert r.status_code == 200, r.text
    assert r.json()["version"] == 1

    r = s.get(f"{API}/vault")
    assert r.status_code == 200
    assert r.json()["ciphertext"] == blob_v1
    assert r.json()["version"] == 1

    # Update válido con la versión correcta
    blob_v2 = _fake_ciphertext("vault-v2")
    r = s.put(f"{API}/vault", json={"ciphertext": blob_v2, "version": 1})
    assert r.status_code == 200
    assert r.json()["version"] == 2

    # Update con versión desactualizada -> 409 (evita sobrescritura silenciosa)
    r = s.put(f"{API}/vault", json={"ciphertext": _fake_ciphertext("stale"), "version": 1})
    assert r.status_code == 409

    # El blob en el servidor no cambió tras el conflicto
    r = s.get(f"{API}/vault")
    assert r.json()["ciphertext"] == blob_v2
    assert r.json()["version"] == 2


def test_vault_metadata_only_exposes_version_and_updated_at(registered_user):
    s = registered_user["session"]
    s.put(f"{API}/vault", json={"ciphertext": _fake_ciphertext("data"), "version": 0})
    r = s.get(f"{API}/vault/metadata")
    assert r.status_code == 200
    assert set(r.json().keys()) == {"version", "updated_at"}


def test_vault_isolation_between_users(registered_user):
    other_username = f"test_other_{int(time.time() * 1000)}"
    s2 = requests.Session()
    r = s2.post(
        f"{API}/auth/register",
        json={"username": other_username, "auth_hash": _auth_hash_for("OtroPassw0rd!!")},
    )
    assert r.status_code == 200

    s1 = registered_user["session"]
    s1.put(f"{API}/vault", json={"ciphertext": _fake_ciphertext("owner-only"), "version": 0})

    r = s2.get(f"{API}/vault")
    assert r.status_code == 404  # el otro usuario no tiene vault propio


# ---------- Generator (opcional, sección 5) ----------
def test_generator_default_length():
    r = requests.post(
        f"{API}/generator/password",
        json={"length": 20, "uppercase": True, "lowercase": True, "numbers": True, "symbols": True},
    )
    assert r.status_code == 200
    body = r.json()
    assert body["length"] == 20
    assert len(body["password"]) == 20


def test_generator_only_lowercase():
    r = requests.post(
        f"{API}/generator/password",
        json={"length": 12, "uppercase": False, "lowercase": True, "numbers": False, "symbols": False},
    )
    assert r.status_code == 200
    pwd = r.json()["password"]
    assert len(pwd) == 12
    assert pwd.islower() and pwd.isalpha()


def test_generator_no_charset_returns_400():
    r = requests.post(
        f"{API}/generator/password",
        json={"length": 12, "uppercase": False, "lowercase": False, "numbers": False, "symbols": False},
    )
    assert r.status_code == 400
