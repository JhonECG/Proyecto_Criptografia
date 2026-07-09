"""Generador de contraseñas — endpoint opcional (sección 5 del PRD).

Sin estado, sin autenticación: no toca el vault. El CSPRNG real de la app
vive en el cliente; esto se expone solo por conveniencia.
"""
import secrets
import string

from fastapi import APIRouter, HTTPException

from app.schemas.generator import GeneratorOptions, GeneratorOut

router = APIRouter(prefix="/generator", tags=["generator"])


@router.post("/password", response_model=GeneratorOut)
async def generate_password(opts: GeneratorOptions):
    alphabet = ""
    if opts.lowercase:
        alphabet += string.ascii_lowercase
    if opts.uppercase:
        alphabet += string.ascii_uppercase
    if opts.numbers:
        alphabet += string.digits
    if opts.symbols:
        alphabet += "!@#$%^&*()-_=+[]{};:,.<>/?"
    if not alphabet:
        raise HTTPException(status_code=400, detail="Debe seleccionar al menos un tipo de carácter")
    password = "".join(secrets.choice(alphabet) for _ in range(opts.length))
    return {"password": password, "length": opts.length}
