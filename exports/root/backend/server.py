from dotenv import load_dotenv
from pathlib import Path

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / ".env")

import os
import uuid
import logging
from datetime import datetime, timezone, timedelta
from typing import List, Optional

import bcrypt
import jwt
from fastapi import FastAPI, APIRouter, HTTPException, Depends, Request, Response
from fastapi.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
from pydantic import BaseModel, EmailStr, Field

# ---------------------------------------------------------------------------
# Config
# ---------------------------------------------------------------------------
JWT_ALGORITHM = "HS256"
ACCESS_TOKEN_MINUTES = 60 * 12  # 12h — practical for a demo password manager
REFRESH_TOKEN_DAYS = 7

mongo_url = os.environ["MONGO_URL"]
db_name = os.environ["DB_NAME"]
client = AsyncIOMotorClient(mongo_url)
db = client[db_name]

app = FastAPI(title="Kript API")
api_router = APIRouter(prefix="/api")

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s - %(name)s - %(levelname)s - %(message)s",
)
logger = logging.getLogger("kript")


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------
def hash_password(password: str) -> str:
    return bcrypt.hashpw(password.encode("utf-8"), bcrypt.gensalt()).decode("utf-8")


def verify_password(plain: str, hashed: str) -> bool:
    try:
        return bcrypt.checkpw(plain.encode("utf-8"), hashed.encode("utf-8"))
    except Exception:
        return False


def get_jwt_secret() -> str:
    return os.environ["JWT_SECRET"]


def create_access_token(user_id: str, email: str) -> str:
    payload = {
        "sub": user_id,
        "email": email,
        "exp": datetime.now(timezone.utc) + timedelta(minutes=ACCESS_TOKEN_MINUTES),
        "type": "access",
    }
    return jwt.encode(payload, get_jwt_secret(), algorithm=JWT_ALGORITHM)


def create_refresh_token(user_id: str) -> str:
    payload = {
        "sub": user_id,
        "exp": datetime.now(timezone.utc) + timedelta(days=REFRESH_TOKEN_DAYS),
        "type": "refresh",
    }
    return jwt.encode(payload, get_jwt_secret(), algorithm=JWT_ALGORITHM)


def set_auth_cookies(response: Response, access: str, refresh: str) -> None:
    response.set_cookie(
        "access_token", access, httponly=True, secure=True, samesite="none",
        max_age=ACCESS_TOKEN_MINUTES * 60, path="/",
    )
    response.set_cookie(
        "refresh_token", refresh, httponly=True, secure=True, samesite="none",
        max_age=REFRESH_TOKEN_DAYS * 86400, path="/",
    )


def clear_auth_cookies(response: Response) -> None:
    response.delete_cookie("access_token", path="/")
    response.delete_cookie("refresh_token", path="/")


def sanitize_user(doc: dict) -> dict:
    return {
        "id": doc["id"],
        "email": doc["email"],
        "name": doc.get("name", ""),
        "created_at": doc.get("created_at"),
    }


async def get_current_user(request: Request) -> dict:
    token = request.cookies.get("access_token")
    if not token:
        auth = request.headers.get("Authorization", "")
        if auth.startswith("Bearer "):
            token = auth[7:]
    if not token:
        raise HTTPException(status_code=401, detail="No autenticado")
    try:
        payload = jwt.decode(token, get_jwt_secret(), algorithms=[JWT_ALGORITHM])
        if payload.get("type") != "access":
            raise HTTPException(status_code=401, detail="Token inválido")
        user = await db.users.find_one({"id": payload["sub"]}, {"_id": 0})
        if not user:
            raise HTTPException(status_code=401, detail="Usuario no encontrado")
        return user
    except jwt.ExpiredSignatureError:
        raise HTTPException(status_code=401, detail="Token expirado")
    except jwt.InvalidTokenError:
        raise HTTPException(status_code=401, detail="Token inválido")


# ---------------------------------------------------------------------------
# Schemas
# ---------------------------------------------------------------------------
class RegisterIn(BaseModel):
    email: EmailStr
    password: str = Field(min_length=6)
    name: Optional[str] = ""


class LoginIn(BaseModel):
    email: EmailStr
    password: str


class UserOut(BaseModel):
    id: str
    email: EmailStr
    name: str = ""
    created_at: Optional[datetime] = None


class CredentialIn(BaseModel):
    name: str = Field(min_length=1, max_length=120)
    username: str = ""
    password: str = ""
    url: str = ""
    notes: str = ""
    category: str = "general"
    favorite: bool = False


class CredentialOut(CredentialIn):
    id: str
    created_at: datetime
    updated_at: datetime


class GeneratorOptions(BaseModel):
    length: int = Field(default=16, ge=4, le=128)
    uppercase: bool = True
    lowercase: bool = True
    numbers: bool = True
    symbols: bool = True


# ---------------------------------------------------------------------------
# Auth routes
# ---------------------------------------------------------------------------
@api_router.post("/auth/register", response_model=UserOut)
async def register(payload: RegisterIn, response: Response):
    email = payload.email.lower().strip()
    if await db.users.find_one({"email": email}):
        raise HTTPException(status_code=400, detail="El correo ya está registrado")
    user_doc = {
        "id": str(uuid.uuid4()),
        "email": email,
        "name": (payload.name or "").strip(),
        "password_hash": hash_password(payload.password),
        "created_at": datetime.now(timezone.utc).isoformat(),
    }
    await db.users.insert_one(user_doc)
    access = create_access_token(user_doc["id"], email)
    refresh = create_refresh_token(user_doc["id"])
    set_auth_cookies(response, access, refresh)
    return sanitize_user(user_doc)


@api_router.post("/auth/login", response_model=UserOut)
async def login(payload: LoginIn, response: Response):
    email = payload.email.lower().strip()
    user = await db.users.find_one({"email": email}, {"_id": 0})
    if not user or not verify_password(payload.password, user["password_hash"]):
        raise HTTPException(status_code=401, detail="Credenciales inválidas")
    access = create_access_token(user["id"], email)
    refresh = create_refresh_token(user["id"])
    set_auth_cookies(response, access, refresh)
    return sanitize_user(user)


@api_router.post("/auth/logout")
async def logout(response: Response):
    clear_auth_cookies(response)
    return {"ok": True}


@api_router.get("/auth/me", response_model=UserOut)
async def me(user: dict = Depends(get_current_user)):
    return sanitize_user(user)


@api_router.post("/auth/refresh")
async def refresh_token(request: Request, response: Response):
    token = request.cookies.get("refresh_token")
    if not token:
        raise HTTPException(status_code=401, detail="Sin refresh token")
    try:
        payload = jwt.decode(token, get_jwt_secret(), algorithms=[JWT_ALGORITHM])
        if payload.get("type") != "refresh":
            raise HTTPException(status_code=401, detail="Token inválido")
        user = await db.users.find_one({"id": payload["sub"]}, {"_id": 0})
        if not user:
            raise HTTPException(status_code=401, detail="Usuario no encontrado")
        access = create_access_token(user["id"], user["email"])
        response.set_cookie(
            "access_token", access, httponly=True, secure=True, samesite="none",
            max_age=ACCESS_TOKEN_MINUTES * 60, path="/",
        )
        return {"ok": True}
    except jwt.InvalidTokenError:
        raise HTTPException(status_code=401, detail="Token inválido")


# ---------------------------------------------------------------------------
# Credentials CRUD
# ---------------------------------------------------------------------------
def _cred_doc_to_out(doc: dict) -> dict:
    return {
        "id": doc["id"],
        "name": doc.get("name", ""),
        "username": doc.get("username", ""),
        "password": doc.get("password", ""),
        "url": doc.get("url", ""),
        "notes": doc.get("notes", ""),
        "category": doc.get("category", "general"),
        "favorite": bool(doc.get("favorite", False)),
        "created_at": datetime.fromisoformat(doc["created_at"]) if isinstance(doc["created_at"], str) else doc["created_at"],
        "updated_at": datetime.fromisoformat(doc["updated_at"]) if isinstance(doc["updated_at"], str) else doc["updated_at"],
    }


@api_router.get("/credentials", response_model=List[CredentialOut])
async def list_credentials(user: dict = Depends(get_current_user)):
    docs = await db.credentials.find({"user_id": user["id"]}, {"_id": 0}).sort("updated_at", -1).to_list(1000)
    return [_cred_doc_to_out(d) for d in docs]


@api_router.post("/credentials", response_model=CredentialOut)
async def create_credential(payload: CredentialIn, user: dict = Depends(get_current_user)):
    now = datetime.now(timezone.utc).isoformat()
    doc = {
        "id": str(uuid.uuid4()),
        "user_id": user["id"],
        **payload.model_dump(),
        "created_at": now,
        "updated_at": now,
    }
    await db.credentials.insert_one(doc)
    return _cred_doc_to_out(doc)


@api_router.put("/credentials/{cred_id}", response_model=CredentialOut)
async def update_credential(cred_id: str, payload: CredentialIn, user: dict = Depends(get_current_user)):
    existing = await db.credentials.find_one({"id": cred_id, "user_id": user["id"]}, {"_id": 0})
    if not existing:
        raise HTTPException(status_code=404, detail="Credencial no encontrada")
    updates = {
        **payload.model_dump(),
        "updated_at": datetime.now(timezone.utc).isoformat(),
    }
    await db.credentials.update_one({"id": cred_id, "user_id": user["id"]}, {"$set": updates})
    merged = {**existing, **updates}
    return _cred_doc_to_out(merged)


@api_router.delete("/credentials/{cred_id}")
async def delete_credential(cred_id: str, user: dict = Depends(get_current_user)):
    res = await db.credentials.delete_one({"id": cred_id, "user_id": user["id"]})
    if res.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Credencial no encontrada")
    return {"ok": True}


# ---------------------------------------------------------------------------
# Password generator (server-side helper — CSPRNG via secrets)
# ---------------------------------------------------------------------------
import secrets
import string


@api_router.post("/generator")
async def generate_password(opts: GeneratorOptions):
    alphabet = ""
    if opts.lowercase:
        alphabet += string.ascii_lowercase
    if opts.uppercase:
        alphabet += string.ascii_uppercase
    if opts.numbers:
        alphabet += string.digits
    if opts.symbols:
        alphabet += "!@#$%^&*()-_=+[]{};:,.<>/?"
    if not alphabet:
        raise HTTPException(status_code=400, detail="Debe seleccionar al menos un tipo de carácter")
    pwd = "".join(secrets.choice(alphabet) for _ in range(opts.length))
    return {"password": pwd, "length": opts.length}


# ---------------------------------------------------------------------------
# Health
# ---------------------------------------------------------------------------
@api_router.get("/")
async def root():
    return {"service": "kript", "status": "ok"}


# ---------------------------------------------------------------------------
# Startup tasks
# ---------------------------------------------------------------------------
@app.on_event("startup")
async def on_startup():
    await db.users.create_index("email", unique=True)
    await db.credentials.create_index([("user_id", 1), ("updated_at", -1)])

    admin_email = os.environ.get("ADMIN_EMAIL", "admin@kript.app").lower()
    admin_password = os.environ.get("ADMIN_PASSWORD", "admin123")
    existing = await db.users.find_one({"email": admin_email})
    if not existing:
        await db.users.insert_one({
            "id": str(uuid.uuid4()),
            "email": admin_email,
            "name": "Admin Kript",
            "password_hash": hash_password(admin_password),
            "created_at": datetime.now(timezone.utc).isoformat(),
        })
        logger.info("Admin seeded: %s", admin_email)
    elif not verify_password(admin_password, existing["password_hash"]):
        await db.users.update_one(
            {"email": admin_email},
            {"$set": {"password_hash": hash_password(admin_password)}},
        )
        logger.info("Admin password updated from .env")


@app.on_event("shutdown")
async def on_shutdown():
    client.close()


app.include_router(api_router)

# CORS — credentialed requests need an explicit origin (not "*")
frontend_origin = os.environ.get("FRONTEND_URL", "http://localhost:3000")
app.add_middleware(
    CORSMiddleware,
    allow_origins=[frontend_origin, "http://localhost:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)
