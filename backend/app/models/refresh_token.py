"""Forma del documento `refresh_tokens` en MongoDB (sección 4 del PRD)."""
from datetime import datetime

from pydantic import BaseModel


class RefreshTokenInDB(BaseModel):
    id: str
    user_id: str
    token_hash: str
    expires_at: datetime
    revoked: bool = False
