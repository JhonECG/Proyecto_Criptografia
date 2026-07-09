"""Endpoints del blob cifrado opaco (sección 5 y 3.3 del PRD).

El servidor nunca interpreta `ciphertext`: solo lo guarda/sirve y aplica
control de concurrencia optimista vía `version`.
"""
import uuid
from datetime import datetime, timezone

from fastapi import APIRouter, Depends, HTTPException, Request

from app.config import get_settings
from app.core.rate_limit import limiter
from app.database import db
from app.dependencies import get_current_user
from app.schemas.vault import VaultMetadataOut, VaultOut, VaultPutIn

settings = get_settings()
router = APIRouter(prefix="/vault", tags=["vault"])


@router.get("", response_model=VaultOut)
async def get_vault(user: dict = Depends(get_current_user)):
    doc = await db.encrypted_blobs.find_one({"user_id": user["id"]}, {"_id": 0})
    if not doc:
        raise HTTPException(status_code=404, detail="Vault no encontrado")
    return doc


@router.put("", response_model=VaultMetadataOut)
async def put_vault(payload: VaultPutIn, user: dict = Depends(get_current_user)):
    if len(payload.ciphertext.encode("utf-8")) > settings.max_blob_size_bytes:
        raise HTTPException(status_code=413, detail="El blob excede el tamaño máximo permitido")

    now = datetime.now(timezone.utc)
    existing = await db.encrypted_blobs.find_one({"user_id": user["id"]}, {"_id": 0})

    if not existing:
        if payload.version != 0:
            raise HTTPException(status_code=409, detail="Conflicto de versión")
        new_version = 1
        await db.encrypted_blobs.insert_one({
            "id": str(uuid.uuid4()),
            "user_id": user["id"],
            "ciphertext": payload.ciphertext,
            "version": new_version,
            "created_at": now,
            "updated_at": now,
        })
    else:
        if payload.version != existing["version"]:
            raise HTTPException(status_code=409, detail="Conflicto de versión")
        new_version = existing["version"] + 1
        await db.encrypted_blobs.update_one(
            {"user_id": user["id"]},
            {"$set": {"ciphertext": payload.ciphertext, "version": new_version, "updated_at": now}},
        )

    return {"version": new_version, "updated_at": now}


@router.get("/metadata", response_model=VaultMetadataOut)
@limiter.limit("30/minute")
async def get_vault_metadata(request: Request, user: dict = Depends(get_current_user)):
    doc = await db.encrypted_blobs.find_one(
        {"user_id": user["id"]}, {"_id": 0, "version": 1, "updated_at": 1}
    )
    if not doc:
        raise HTTPException(status_code=404, detail="Vault no encontrado")
    return doc
