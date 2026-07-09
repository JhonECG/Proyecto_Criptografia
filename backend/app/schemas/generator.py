"""Pydantic request/response schemas para /generator."""
from pydantic import BaseModel, Field


class GeneratorOptions(BaseModel):
    length: int = Field(default=16, ge=4, le=128)
    uppercase: bool = True
    lowercase: bool = True
    numbers: bool = True
    symbols: bool = True


class GeneratorOut(BaseModel):
    password: str
    length: int
