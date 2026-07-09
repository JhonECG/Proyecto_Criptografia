"""Limiter compartido (slowapi) — sección 8: rate limiting en /auth/login y /vault."""
from slowapi import Limiter
from slowapi.util import get_remote_address

limiter = Limiter(key_func=get_remote_address)
