"""Forma del documento `encrypted_blobs` en MongoDB (sección 4 del PRD).

`metadata` (version + updated_at) vive embebido aquí en vez de en una
colección separada, ya que solo se necesita la última versión, no un
historial completo.
"""
from datetime import datetime

from pydantic import BaseModel


class VaultBlobInDB(BaseModel):
    id: str
    user_id: str
    ciphertext: str  # base64 — vault completo cifrado, opaco para el servidor
    version: int
    created_at: datetime
    updated_at: datetime
