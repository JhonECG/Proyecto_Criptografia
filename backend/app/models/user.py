"""Forma del documento `users` en MongoDB (sección 4 del PRD)."""
from datetime import datetime

from pydantic import BaseModel


class UserInDB(BaseModel):
    id: str
    username: str
    auth_hash: str  # bcrypt/argon2 sobre el auth hash ya derivado en el cliente
    created_at: datetime
