"""JWT (access + refresh) y rehashing del auth_hash recibido del cliente.

Nota (sección 3.2 del PRD): el `auth_hash` que llega en el body ya fue
derivado en el cliente a partir de la master password con un contexto
distinto al de la Vault Key. Aquí solo lo rehasheamos con bcrypt como
defensa en profundidad — el backend nunca ve la master password ni puede
derivar la Vault Key a partir de lo que almacena.
"""
import hashlib
import secrets
from datetime import datetime, timedelta, timezone

import jwt
from passlib.context import CryptContext

from app.config import get_settings

settings = get_settings()
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")


# ---------------------------------------------------------------------------
# Auth hash rehashing (defensa en profundidad)
# ---------------------------------------------------------------------------
def hash_auth_hash(auth_hash: str) -> str:
    return pwd_context.hash(auth_hash)


def verify_auth_hash(plain: str, hashed: str) -> bool:
    try:
        return pwd_context.verify(plain, hashed)
    except Exception:
        return False


# ---------------------------------------------------------------------------
# Access token (JWT stateless)
# ---------------------------------------------------------------------------
def create_access_token(user_id: str) -> str:
    payload = {
        "sub": user_id,
        "type": "access",
        "exp": datetime.now(timezone.utc) + timedelta(minutes=settings.access_token_expire_minutes),
    }
    return jwt.encode(payload, settings.jwt_secret, algorithm=settings.jwt_algorithm)


def decode_access_token(token: str) -> dict:
    payload = jwt.decode(token, settings.jwt_secret, algorithms=[settings.jwt_algorithm])
    if payload.get("type") != "access":
        raise jwt.InvalidTokenError("not an access token")
    return payload


# ---------------------------------------------------------------------------
# Refresh token (opaco, revocable — se guarda su hash en `refresh_tokens`)
# ---------------------------------------------------------------------------
def generate_refresh_token() -> str:
    return secrets.token_urlsafe(48)


def hash_refresh_token(token: str) -> str:
    return hashlib.sha256(token.encode("utf-8")).hexdigest()


def refresh_token_expiry() -> datetime:
    return datetime.now(timezone.utc) + timedelta(days=settings.refresh_token_expire_days)
