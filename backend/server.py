"""Entrypoint FastAPI — Kript backend (untrusted storage, zero-knowledge).

Ver PRD_Backend_Kript.md. El servidor solo autentica usuarios (contra un
auth_hash que no permite derivar la Vault Key) y almacena/entrega un blob
cifrado opaco por usuario. Nunca ve texto plano ni la master password.
"""
import logging

from fastapi import APIRouter, FastAPI
from fastapi.middleware.cors import CORSMiddleware
from slowapi import _rate_limit_exceeded_handler
from slowapi.errors import RateLimitExceeded

from app.config import get_settings
from app.core.rate_limit import limiter
from app.core.security_headers import SecurityHeadersMiddleware
from app.database import close_db_connection, create_indexes
from app.routers import auth, generator, vault

settings = get_settings()

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s - %(name)s - %(levelname)s - %(message)s",
)
logger = logging.getLogger("kript")
# Nunca loguear auth_hash, ciphertext completo, ni JWTs (sección 8 del PRD).

app = FastAPI(title="Kript API")
app.state.limiter = limiter
app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)

api_router = APIRouter(prefix="/api")


@api_router.get("/")
async def root():
    return {"service": "kript", "status": "ok"}


api_router.include_router(auth.router)
api_router.include_router(vault.router)
api_router.include_router(generator.router)
app.include_router(api_router)

# CORS — credentialed requests need explicit origins (nunca "*").
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origin_list,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# CSP + cabeceras de seguridad — mitigan XSS/clickjacking contra la Vault Key
# en memoria (PRD frontend, sección de seguridad). HSTS solo tiene efecto
# real detrás de HTTPS; en dev local (cookie_secure=False) se desactiva.
app.add_middleware(SecurityHeadersMiddleware, hsts=settings.cookie_secure)


@app.on_event("startup")
async def on_startup():
    await create_indexes()
    logger.info("Kript API started")


@app.on_event("shutdown")
async def on_shutdown():
    await close_db_connection()
