# PRD Técnico — Backend de Kript

**Proyecto:** Kript (gestor de credenciales y generador de contraseñas)
**Componente:** Backend (API) — **Server Side (Untrusted)**
**Stack:** Python 3.9+, FastAPI, MongoDB
**Arquitectura:** Zero-Knowledge Password Manager
**Estado:** Desde cero

---

## 1. Objetivo

Construir una API REST que actúa como **almacenamiento no confiable (untrusted)** de un vault cifrado. El backend **nunca ve texto plano ni la master password**: todo el cifrado, derivación de claves y generación de contraseñas ocurre en el cliente. El servidor solo:

1. Autentica usuarios (contra un hash de auth que **no** es la master password ni permite derivar la clave de cifrado).
2. Almacena/entrega **blobs cifrados opacos** (el vault completo del usuario), con versionado para control de concurrencia.

Este PRD cubre únicamente el backend. El módulo criptográfico (KDF, AEAD, CSPRNG, Export Key) vive en el cliente y se documenta aquí solo como contrato/contexto necesario para diseñar la API.

---

## 2. Stack técnico

| Capa | Tecnología |
|---|---|
| Framework API | FastAPI |
| Base de datos | MongoDB (driver `motor`, async) |
| Auth | JWT (access + refresh tokens) |
| Hashing del auth hash recibido | `passlib` con `bcrypt` o `argon2` (defensa en profundidad sobre el hash que ya envía el cliente) |
| Validación de datos | Pydantic v2 |
| Variables de entorno | `python-dotenv` |

> Nota: el backend **no necesita** librería de cifrado simétrico (AES/ChaCha20) ni de KDF (Argon2/PBKDF2) para las credenciales — eso corre 100% en el cliente. El backend solo mueve bytes cifrados.

---

## 3. Modelo de seguridad (arquitectura zero-knowledge)

### 3.1 División de confianza

- **Cliente (trusted):** posee la master password, el `Client Secret` (device-bound), deriva la `Vault Key`, cifra/descifra entradas, genera contraseñas, hace auto-lock.
- **Servidor (untrusted):** solo ve un `auth hash` para login y blobs cifrados sin contexto. No puede descifrar nada aunque la BD sea comprometida.

### 3.2 Derivaciones que ocurren en el cliente (fuera del backend, documentadas para contrato de API)

| Derivación | Entradas | Salida | Uso |
|---|---|---|---|
| Vault Key | master password + Client Secret (device-bound) + salt único de usuario | Vault Key (AES-256/ChaCha20 key) | Cifrar/descifrar entradas del vault localmente |
| Auth Hash | master password (+ contexto/salt distinto al de Vault Key) | Auth Hash | Se envía al backend en login/registro — **nunca permite derivar la Vault Key** |
| Export Key | master password + export salt | Export Key (≠ Vault Key) | Cifrar el archivo de export/import para mover el vault entre dispositivos |

**Regla crítica:** Auth Hash ≠ Vault Key ≠ Export Key. Deben derivarse con salts/contextos distintos para que un backend comprometido (que solo ve el Auth Hash) no pueda reconstruir la clave de cifrado.

### 3.3 Lo que el backend sí controla

- Verificar el Auth Hash recibido contra el guardado (rehasheado con bcrypt/argon2 al registrar, como defensa adicional).
- Emitir/rotar JWT (access + refresh).
- Guardar y servir el **blob cifrado del vault** (probablemente un único blob por usuario, no un documento por credencial — así el servidor no aprende ni cuántas credenciales hay con certeza, según cómo se paddee el blob).
- Versionado optimista: cada blob tiene un `version`; si el cliente sube con una versión desactualizada (porque otro dispositivo ya subió cambios), el backend rechaza con `409 Conflict` para evitar sobrescrituras silenciosas.

### 3.4 Auto-lock (cliente, contexto)

Por inactividad, el cliente borra la Vault Key de memoria y requiere re-derivación (pedir la master password de nuevo). Esto no impacta al backend directamente, pero implica que los JWT deben poder expirar/refrescarse de forma independiente al estado del vault en memoria del cliente.

---

## 4. Modelos de datos (MongoDB)

### `users`
```json
{
  "_id": "ObjectId",
  "username": "string, unique",
  "auth_hash": "string (bcrypt/argon2 sobre el auth hash recibido del cliente)",
  "created_at": "datetime"
}
```

### `encrypted_blobs`
```json
{
  "_id": "ObjectId",
  "user_id": "ObjectId (ref users)",
  "ciphertext": "string (base64) — vault completo cifrado, opaco para el servidor",
  "version": "int",
  "updated_at": "datetime"
}
```

### `metadata`
```json
{
  "_id": "ObjectId",
  "user_id": "ObjectId",
  "version": "int",
  "created_at": "datetime",
  "updated_at": "datetime"
}
```
> `metadata` puede vivir embebido dentro de `encrypted_blobs` en vez de ser colección separada — evaluar si se necesita historial de versiones (para recuperación) o solo la última.

### `refresh_tokens`
```json
{
  "_id": "ObjectId",
  "user_id": "ObjectId",
  "token_hash": "string",
  "expires_at": "datetime",
  "revoked": "boolean"
}
```

---

## 5. Endpoints propuestos

### Auth
| Método | Ruta | Descripción |
|---|---|---|
| POST | `/auth/register` | Recibe `username` + `auth_hash` (ya derivado en cliente), lo rehashea y guarda |
| POST | `/auth/login` | Verifica `auth_hash`, devuelve access + refresh token |
| POST | `/auth/refresh` | Rota refresh token, devuelve nuevo access token |
| POST | `/auth/logout` | Revoca refresh token |

### Vault (blob opaco)
| Método | Ruta | Descripción |
|---|---|---|
| GET | `/vault` | Descarga el blob cifrado + `version` actual |
| PUT | `/vault` | Sube nuevo blob cifrado; requiere `version` esperada — `409` si no coincide (conflicto de sincronización) |
| GET | `/vault/metadata` | Solo `version` + `updated_at`, para que el cliente chequee si necesita sincronizar sin descargar el blob completo |

### Generador de contraseñas
No aplica al backend en esta arquitectura — el CSPRNG y la generación de contraseñas viven en el módulo criptográfico del cliente. Si se quiere exponer igual por conveniencia, sería un endpoint sin estado que no toca el vault ni requiere auth:

| Método | Ruta | Descripción |
|---|---|---|
| POST | `/generator/password` *(opcional)* | Genera contraseña aleatoria segura, sin persistir nada |

---

## 6. Estructura de carpetas sugerida

```
backend/
├── server.py                # entrypoint FastAPI
├── requirements.txt
├── .env.example
├── app/
│   ├── config.py              # settings (Pydantic BaseSettings)
│   ├── database.py            # conexión Mongo (motor)
│   ├── models/
│   │   ├── user.py
│   │   └── vault_blob.py
│   ├── schemas/                # Pydantic request/response
│   ├── routers/
│   │   ├── auth.py
│   │   └── vault.py
│   ├── core/
│   │   └── security.py        # JWT, hashing del auth_hash recibido
│   └── dependencies.py        # get_current_user, etc.
└── tests/
```

---

## 7. Variables de entorno (`.env`)

```
MONGO_URL=mongodb://localhost:27017
DB_NAME=kript
JWT_SECRET=
JWT_ALGORITHM=HS256
ACCESS_TOKEN_EXPIRE_MINUTES=15
REFRESH_TOKEN_EXPIRE_DAYS=7
CORS_ORIGINS=http://localhost:3000
MAX_BLOB_SIZE_KB=512
```

---

## 8. Requisitos no funcionales

- El backend debe rechazar payloads que excedan el tamaño esperado de blob (defensa por tamaño/formato; no puede "saber" qué es texto plano, pero sí limitar y tipar el campo como base64 opaco).
- CORS restringido al origin del frontend.
- Rate limiting en `/auth/login` (fuerza bruta) y en `/vault` (evitar polling agresivo de `metadata`).
- Respuestas de error de auth genéricas ("credenciales inválidas"), sin filtrar si el username existe.
- Logs sin datos sensibles: nunca loguear `auth_hash`, `ciphertext` completo, ni JWT.
- Control de concurrencia optimista en `/vault` (ver 3.3) para soportar multi-dispositivo sin perder cambios.
- HTTPS asumido en producción.

---

## 9. Preguntas abiertas antes de generar código

1. ~~**KDF exacto:** ¿Argon2id o PBKDF2-HMAC-SHA256 para derivar Vault Key / Auth Hash / Export Key en el cliente?~~ **Decidido: PBKDF2-HMAC-SHA256, 310,000 iteraciones.** Implementado en `frontend/src/crypto/kdf.js` y `exportKey.js`. Motivo: `Web Crypto API` (`SubtleCrypto`) trae PBKDF2 nativo en todos los navegadores objetivo sin dependencias WASM adicionales (`argon2-browser` no es nativo y añade superficie/tamaño de bundle); 310k iteraciones supera el mínimo OWASP 2023 para SHA-256 (210k). Argon2id queda como mejora futura si se justifica la dependencia WASM — no bloqueante para el MVP.
2. **Separación Auth Hash vs Vault Key:** ¿se logra con salts distintos sobre el mismo KDF, o con un "context string" distinto (ej. HKDF con info="auth" vs info="vault")? Definir el mecanismo exacto.
3. **Conflictos de versión:** cuando `/vault PUT` devuelve `409`, ¿el cliente hace last-write-wins forzado, o hay que soportar merge/resolución manual en el frontend?
4. **Client Secret device-bound:** ¿cómo se sincroniza (o no) entre dispositivos? Por el diagrama, parece que la única vía es el export/import cifrado con Export Key — confirmar que no se espera ningún endpoint de "vincular dispositivo".
5. **RSA/firmas digitales** (visto en el curso): ¿se quiere firmar el blob de export para integridad/no-repudio, dado que ya están viendo firmas RSA y revocación de certificados? Sería un plus académico opcional, no bloqueante para el MVP.

---

## 10. Siguiente paso

Con las respuestas a la sección 9, este documento queda listo para pasarlo a Claude Code y generar el scaffold completo del backend (`server.py`, modelos, routers de auth y vault, `core/security.py`, tests básicos de versionado y auth).
