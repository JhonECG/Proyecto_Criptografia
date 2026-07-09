# PRD Técnico — Frontend de Kript

**Proyecto:** Kript (gestor de credenciales y generador de contraseñas)
**Componente:** Frontend (Client Application) — **Client Side (Trusted)**
**Stack:** React, JavaScript/TypeScript
**Arquitectura:** Zero-Knowledge Password Manager
**Estado:** Desde cero (según diagrama de arquitectura)

Este documento asume el backend descrito en `PRD_Backend_Kript.md` (Auth Service + Vault API de blobs opacos). Aquí vive **todo** el módulo criptográfico: el frontend es el único lugar donde existe texto plano.

---

## 1. Objetivo

Construir la aplicación cliente que:

1. Deriva localmente todas las claves criptográficas (Vault Key, Auth Hash, Export Key) a partir de la master password — **la master password y las claves derivadas nunca salen del dispositivo en texto plano**.
2. Gestiona el vault de credenciales (CRUD) cifrándolo/descifrándolo en memoria.
3. Genera contraseñas seguras con CSPRNG.
4. Sincroniza con el backend subiendo/bajando un blob cifrado versionado.
5. Soporta export/import cifrado para mover el vault entre dispositivos.
6. Implementa auto-lock por inactividad.

---

## 2. Stack técnico

| Capa | Tecnología |
|---|---|
| Framework | React (Create React App / Vite) |
| Estado global | Context API o Zustand (vault en memoria, nunca en localStorage sin cifrar) |
| Criptografía | Web Crypto API (`SubtleCrypto`) para AES-GCM/PBKDF2 nativo; `argon2-browser` (WASM) si se opta por Argon2id |
| HTTP client | `fetch` o `axios`, con interceptor de refresh token |
| Almacenamiento local del Client Secret | `IndexedDB` (preferible a `localStorage` por tamaño/estructura) |
| Formularios | React Hook Form + validación (Zod/Yup) |
| Manejo de sesión | JWT access token en memoria; refresh token en `httpOnly cookie` si el backend lo soporta, o `IndexedDB` como fallback |

---

## 3. Módulo Criptográfico (el corazón del frontend)

Corresponde 1:1 al bloque "Cryptographic Module" del diagrama. Vive aislado en `src/crypto/` y es la única parte del código que toca claves/texto plano.

### 3.1 KDF (Key Derivation Function)

- **Input:** master password + `Client Secret` (device-bound) + salt único de usuario (recibido/generado en registro).
- **Output:** `Vault Key` (256 bits).
- **Algoritmo:** Argon2id (preferido, resistente a GPU/ASIC) o PBKDF2-HMAC-SHA256 con ≥310,000 iteraciones si Argon2id no es viable en el navegador objetivo.
- Se recalcula en cada sesión/desbloqueo — **nunca se persiste la Vault Key**, solo vive en memoria (`useRef`/estado no serializado).

### 3.2 AEAD Cipher (cifrado de entradas)

- **Algoritmo:** AES-256-GCM (soportado nativamente por Web Crypto API) o ChaCha20-Poly1305 si se usa una lib externa.
- Nonce/IV único por cada operación de cifrado (12 bytes aleatorios vía CSPRNG) — **nunca reutilizar nonce con la misma clave**.
- Se cifra el vault completo (o cada entrada, a definir — ver pregunta abierta en PRD del backend sobre blob único vs por-entrada) antes de subir al backend.

### 3.3 CSPRNG

- Fuente: `crypto.getRandomValues()` (Web Crypto API).
- Usos: generación de contraseñas para el usuario, generación de salts, generación de nonces, generación del `Client Secret` al vincular un dispositivo nuevo.

### 3.4 Export Key Derivation

- **Input:** master password + `export salt` (independiente del salt de la Vault Key).
- **Output:** `Export Key`, usada solo para cifrar/descifrar el archivo de export/import.
- Garantiza que el archivo exportado sea portable entre dispositivos sin depender del `Client Secret` device-bound (que no se sincroniza).

### 3.5 Auto-Lock

- Timer de inactividad (configurable, ej. 5–15 min) que:
  - Borra la `Vault Key` de memoria.
  - Bloquea la UI y pide la master password de nuevo para re-derivar.
- Debe engancharse a eventos de actividad del usuario (mousemove, keydown, focus) con debounce.

### 3.6 Auth Hash (frontera con el backend)

- Derivado de la master password con un salt/contexto **distinto** al de la Vault Key (ver pregunta abierta #2 del PRD backend).
- Es lo único relacionado a la master password que efectivamente viaja por red, y solo hacia `/auth/login` y `/auth/register`.

---

## 4. Client Secret (device-bound)

- Se genera con CSPRNG la primera vez que la app corre en un dispositivo (o al vincular uno nuevo) y se guarda en `IndexedDB`, nunca en el backend.
- Es un factor adicional en la derivación de la Vault Key: sin el `Client Secret` del dispositivo original, la master password sola no reconstruye la Vault Key en un dispositivo nuevo.
- **Implicación de producto:** para usar el vault en un dispositivo nuevo, el usuario debe pasar por el flujo de **export/import** (no hay "login y listo" en un dispositivo nunca antes visto). Confirmar que este es el comportamiento deseado antes de implementar — si se quiere login directo multi-dispositivo, el `Client Secret` tendría que dejar de ser parte de la derivación de la Vault Key.

---

## 5. Client Application (features de producto)

Corresponde al bloque "Client Application" del diagrama.

| Feature | Detalle |
|---|---|
| CRUD de entradas | Crear/editar/eliminar credenciales (sitio, usuario, password, notas) — opera sobre el vault descifrado en memoria, luego re-cifra y sube |
| Generador de contraseñas | UI con opciones: longitud, símbolos, mayúsculas, números, exclusión de caracteres ambiguos — usa CSPRNG local |
| Evaluador de fortaleza | Cálculo de entropía en el cliente (sin llamar al backend) |
| Búsqueda/filtro de entradas | Sobre el vault ya descifrado en memoria, nunca contra el backend |
| Auto-lock | Ver 3.5 |
| Export/Import cifrado | Genera archivo con `ciphertext + export salt`; importar pide master password para derivar Export Key y descifrar |
| Indicador de sincronización | Mostrar si el vault local está desactualizado vs el `version` del backend (poll a `/vault/metadata`) |

---

## 6. Flujo de pantallas principal

1. **Registro:** username + master password → deriva Auth Hash → `POST /auth/register` → genera `Client Secret` local → deriva Vault Key → crea vault vacío cifrado → `PUT /vault` inicial.
2. **Login:** username + master password → deriva Auth Hash → `POST /auth/login` → recibe JWT → si el dispositivo ya tiene `Client Secret` local, deriva Vault Key y descifra `GET /vault`; si no lo tiene, requiere import.
3. **Dashboard/vault:** lista de entradas descifradas, CRUD, generador de contraseñas.
4. **Bloqueo (auto-lock o manual):** pide master password, re-deriva Vault Key sin nueva llamada de red (JWT sigue vigente).
5. **Export:** genera y descarga archivo cifrado con Export Key.
6. **Import (dispositivo nuevo):** pide archivo + master password → deriva Export Key → descifra → genera `Client Secret` nuevo para este dispositivo → re-cifra con nueva Vault Key → `PUT /vault`.

---

## 7. Manejo de sesión y sincronización con el backend

- Access token en memoria (no en `localStorage`, para reducir superficie de XSS).
- Refresh token: `httpOnly cookie` si el backend lo setea así, o `IndexedDB` si no.
- Antes de cada `PUT /vault`, incluir el `version` actual conocido; si el backend responde `409`, refrescar (`GET /vault`) y decidir estrategia de conflicto (ver pregunta abierta #3 del PRD backend — depende de esa decisión para diseñar la UI de conflicto).
- Polling opcional a `/vault/metadata` para detectar cambios desde otro dispositivo sin descargar el blob completo.

---

## 8. Estructura de carpetas sugerida

```
frontend/
├── src/
│   ├── crypto/
│   │   ├── kdf.js              # Argon2id / PBKDF2
│   │   ├── aead.js             # AES-GCM encrypt/decrypt
│   │   ├── csprng.js           # wrappers sobre crypto.getRandomValues
│   │   ├── exportKey.js        # derivación de Export Key
│   │   └── autoLock.js         # timer + wipe de Vault Key
│   ├── api/
│   │   ├── authClient.js       # register/login/refresh/logout
│   │   └── vaultClient.js      # GET/PUT /vault, /vault/metadata
│   ├── store/
│   │   ├── sessionStore.js     # JWT, estado de auth
│   │   └── vaultStore.js       # vault descifrado en memoria
│   ├── components/
│   │   ├── auth/               # Login, Register, Unlock
│   │   ├── vault/              # Lista, item, formulario de credencial
│   │   ├── generator/          # Generador de contraseñas
│   │   └── export-import/
│   ├── pages/
│   └── App.jsx
```

---

## 9. Requisitos no funcionales

- Nunca enviar la master password ni la Vault Key por red, ni loguearlas en consola (ni siquiera en `console.log` de debug).
- Nunca persistir la Vault Key descifrada fuera de memoria (no `localStorage`, no `IndexedDB`).
- El `Client Secret` sí se persiste local (es device-bound por diseño), pero no debe exportarse junto al vault.
- Content Security Policy estricta para mitigar XSS (dado que un XSS en esta app compromete la Vault Key en memoria).
- Manejo de errores de red que no bloquee el auto-lock ni deje la Vault Key en memoria más tiempo del necesario.

---

## 10. Dependencia directa de decisiones aún abiertas (ver PRD backend, sección 9)

Estas preguntas del PRD del backend determinan implementación exacta en frontend:

1. KDF exacto (Argon2id vs PBKDF2) y parámetros (iteraciones/memoria).
2. Mecanismo de separación Auth Hash vs Vault Key (salts distintos vs HKDF con context strings).
3. Estrategia de resolución de conflictos de versión (afecta directamente la UI del paso 7).
4. Confirmar que no habrá "vincular dispositivo" fuera del flujo de export/import.

---

## 11. Siguiente paso

Con las decisiones de la sección 10 cerradas, este PRD queda listo para pasar a Claude Code y generar el scaffold del frontend: módulo `crypto/`, clientes de API, stores, y las pantallas de auth/vault/generador/export-import.
