"""Pydantic request/response schemas para /vault."""
from datetime import datetime

from pydantic import BaseModel, Field


class VaultPutIn(BaseModel):
    ciphertext: str = Field(min_length=1)
    version: int = Field(ge=0, description="Versión esperada (la última vista por el cliente)")


class VaultOut(BaseModel):
    ciphertext: str
    version: int
    updated_at: datetime


class VaultMetadataOut(BaseModel):
    version: int
    updated_at: datetime
