"""Pydantic request/response schemas para /auth."""
from datetime import datetime

from pydantic import BaseModel, Field


class RegisterIn(BaseModel):
    username: str = Field(min_length=3, max_length=64)
    auth_hash: str = Field(min_length=16, max_length=512)


class LoginIn(BaseModel):
    username: str
    auth_hash: str


class UserOut(BaseModel):
    id: str
    username: str
    created_at: datetime
