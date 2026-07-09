"""Conexión a MongoDB (motor, async)."""
from motor.motor_asyncio import AsyncIOMotorClient

from app.config import get_settings

settings = get_settings()

_client = AsyncIOMotorClient(settings.mongo_url, tz_aware=True)
db = _client[settings.db_name]


async def create_indexes() -> None:
    await db.users.create_index("username", unique=True)
    await db.encrypted_blobs.create_index("user_id", unique=True)
    await db.refresh_tokens.create_index("token_hash", unique=True)
    await db.refresh_tokens.create_index("expires_at", expireAfterSeconds=0)


async def close_db_connection() -> None:
    _client.close()
