"""Endpoints de autenticación (sección 5 del PRD).

El backend nunca ve la master password: `auth_hash` ya llega derivado desde
el cliente. Aquí solo se rehashea (bcrypt) y se verifica — ver
app/core/security.py.
"""
import uuid
from datetime import datetime, timezone

from fastapi import APIRouter, HTTPException, Request, Response

from app.config import get_settings
from app.core.rate_limit import limiter
from app.core.security import (
    create_access_token,
    generate_refresh_token,
    hash_auth_hash,
    hash_refresh_token,
    refresh_token_expiry,
    verify_auth_hash,
)
from app.database import db
from app.schemas.auth import LoginIn, RegisterIn, UserOut

settings = get_settings()
router = APIRouter(prefix="/auth", tags=["auth"])

GENERIC_AUTH_ERROR = "Credenciales inválidas"


def _set_auth_cookies(response: Response, access_token: str, refresh_token: str) -> None:
    # SameSite=None requiere Secure; en dev local (http, cookie_secure=False) usamos Lax.
    samesite = "none" if settings.cookie_secure else "lax"
    response.set_cookie(
        "access_token", access_token, httponly=True, secure=settings.cookie_secure, samesite=samesite,
        max_age=settings.access_token_expire_minutes * 60, path="/",
    )
    response.set_cookie(
        "refresh_token", refresh_token, httponly=True, secure=settings.cookie_secure, samesite=samesite,
        max_age=settings.refresh_token_expire_days * 86400, path="/",
    )


def _clear_auth_cookies(response: Response) -> None:
    response.delete_cookie("access_token", path="/")
    response.delete_cookie("refresh_token", path="/")


def _sanitize_user(doc: dict) -> dict:
    return {"id": doc["id"], "username": doc["username"], "created_at": doc["created_at"]}


async def _issue_tokens(user_id: str, response: Response) -> None:
    access = create_access_token(user_id)
    refresh = generate_refresh_token()
    await db.refresh_tokens.insert_one({
        "id": str(uuid.uuid4()),
        "user_id": user_id,
        "token_hash": hash_refresh_token(refresh),
        "expires_at": refresh_token_expiry(),
        "revoked": False,
    })
    _set_auth_cookies(response, access, refresh)


@router.post("/register", response_model=UserOut)
@limiter.limit("5/minute")
async def register(request: Request, payload: RegisterIn, response: Response):
    username = payload.username.strip().lower()
    if await db.users.find_one({"username": username}):
        raise HTTPException(status_code=400, detail="El usuario ya está registrado")
    user_doc = {
        "id": str(uuid.uuid4()),
        "username": username,
        "auth_hash": hash_auth_hash(payload.auth_hash),
        "created_at": datetime.now(timezone.utc),
    }
    await db.users.insert_one(user_doc)
    await _issue_tokens(user_doc["id"], response)
    return _sanitize_user(user_doc)


@router.post("/login", response_model=UserOut)
@limiter.limit("5/minute")
async def login(request: Request, payload: LoginIn, response: Response):
    username = payload.username.strip().lower()
    user = await db.users.find_one({"username": username}, {"_id": 0})
    if not user or not verify_auth_hash(payload.auth_hash, user["auth_hash"]):
        raise HTTPException(status_code=401, detail=GENERIC_AUTH_ERROR)
    await _issue_tokens(user["id"], response)
    return _sanitize_user(user)


@router.post("/refresh")
async def refresh(request: Request, response: Response):
    token = request.cookies.get("refresh_token")
    if not token:
        raise HTTPException(status_code=401, detail="Sin refresh token")

    token_hash = hash_refresh_token(token)
    record = await db.refresh_tokens.find_one({"token_hash": token_hash})
    if not record or record["revoked"] or record["expires_at"] <= datetime.now(timezone.utc):
        raise HTTPException(status_code=401, detail="Refresh token inválido o expirado")

    # Rotación: se revoca el token usado y se emite un par nuevo.
    await db.refresh_tokens.update_one({"id": record["id"]}, {"$set": {"revoked": True}})
    await _issue_tokens(record["user_id"], response)
    return {"ok": True}


@router.post("/logout")
async def logout(request: Request, response: Response):
    token = request.cookies.get("refresh_token")
    if token:
        await db.refresh_tokens.update_one(
            {"token_hash": hash_refresh_token(token)}, {"$set": {"revoked": True}}
        )
    _clear_auth_cookies(response)
    return {"ok": True}
