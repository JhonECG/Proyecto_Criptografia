# Kript - Proyecto de Criptografía

Kript es un gestor de credenciales y generador de contraseñas seguras. Este proyecto está dividido en una API construida con Python (FastAPI) y una interfaz de usuario desarrollada en React.

## Requisitos Previos

Antes de comenzar, asegúrate de tener instalado lo siguiente en tu sistema:
- [Node.js](https://nodejs.org/) (versión 16 o superior recomendada)
- [Python](https://www.python.org/) (versión 3.9 o superior)
- [MongoDB](https://www.mongodb.com/try/download/community) (Servidor local en ejecución o una URL de conexión a MongoDB Atlas)

---

## Configuración y Ejecución

El proyecto requiere levantar tanto el servidor de backend como la aplicación de frontend de forma simultánea. Abre dos terminales en tu editor de código para seguir estos pasos.

### 1. Backend (FastAPI)

En tu **primera terminal**, navega a la carpeta del backend y configura el entorno virtual:

```bash
# 1. Entrar al directorio
cd backend

# 2. Crear el entorno virtual
python -m venv venv

# 3. Activar el entorno virtual
# En Windows (Git Bash): source venv/Scripts/activate
# En Windows (CMD/PowerShell): .\venv\Scripts\activate
# En Mac/Linux: source venv/bin/activate

# 4. Instalar las dependencias
pip install -r requirements.txt

# 5. Levantar el servidor
uvicorn server:app --reload

```

### 2. Frontend (React)

En tu segunda terminal, navega a la carpeta del frontend. Usaremos yarn para manejar los paquetes:

```bash
# 1. Entrar al directorio
cd frontend

# 2. Instalar Yarn de forma global (solo si no lo tienes instalado)
npm install -g yarn

# 3. Descargar las dependencias del proyecto
yarn install

# 4. Iniciar la aplicación web
yarn start