# 🚀 CAPACITA — Plataforma de Intercambio de Capacidades

> *"Tu talento también es una capacidad"* — Plataforma web colaborativa para el intercambio y orquestación inteligente de habilidades y conocimientos sin intermediación monetaria directa.

---

## 👥 Equipo de Desarrollo & Roles

| Integrante | Liderazgo Principal | Rol Secundario ("Un poco de todo") |
| :--- | :--- | :--- |
| **Miguel** | **Frontend & UX Lead** (React 19, Tailwind CSS, Canvas 2D, Routing) | Consumo SDK Supabase, control de errores Auth, feedback en Toast |
| **Fahida** | **Lógica & Seguridad Lead** (Supabase Auth, Triggers SQL, Servicios JS, Roles) | Maquetación de layouts, modales de confirmación, sanitización de inputs |
| **Franklin** | **Supabase & DB Lead** (PostgreSQL, `pgvector`, Políticas RLS, Storage) | Consultas RPC, scripts de semillas, vistas analíticas |
| **Luis** | **IA, Realtime & QA Lead** (Motor de IA, Workflows, Supabase Realtime, CI/CD) | Pruebas unitarias/E2E, manejo de estados de red, métricas |

---

## 📅 Plan Maestro & Documentación

El cronograma detallado de 11 semanas, la arquitectura técnica de base de datos y la guía de sustentación académica se encuentran documentados en:
📄 **[Plan_Maestro_Capacita_Supabase.pdf](./Plan_Maestro_Capacita_Supabase.pdf)**

---

## 🛠️ Stack Tecnológico

* **Frontend**: [React 19](https://react.dev/) + [Vite](https://vitejs.dev/) + [Tailwind CSS v3](https://tailwindcss.com/)
* **Animaciones & Gráficos**: HTML5 Canvas 2D interactivo (Constelación dinámica a 60 FPS)
* **Backend & Base de Datos**: [Supabase](https://supabase.com/) (PostgreSQL 16 + extensión `pgvector`)
* **Autenticación**: Supabase Auth (JWT, Row Level Security)
* **Tiempo Real**: Supabase Realtime (WebSockets)
* **Almacenamiento**: Supabase Storage

---

## 💻 Instalación y Ejecución Local

### Prerrequisitos
* Node.js 18+ y npm
* Python 3.11+

### Pasos
1. **Clonar el repositorio:**
   ```bash
   git clone https://github.com/miguelvivasvergel-creator/CAPACITA.git
   cd CAPACITA
   ```

2. **Crear los archivos de entorno** (y llenar los valores que te pase el equipo):
   ```bash
   cp .env.example .env
   cp backend/.env.example backend/.env
   ```

3. **Instalar dependencias del frontend y del backend:**
   ```bash
   npm install
   cd backend
   python -m venv .venv
   .venv\Scripts\activate        # En Mac/Linux: source .venv/bin/activate
   pip install -r requirements.txt
   ```

4. **Correr el backend** (desde `backend/`, con el entorno activado):
   ```bash
   python main.py
   ```
   La API queda en `http://127.0.0.1:8000` y la documentación en `http://127.0.0.1:8000/docs`.

5. **Correr el frontend** (en otra terminal, desde la raíz):
   ```bash
   npm run dev
   ```
   La aplicación estará disponible en `http://localhost:5173`.

> Las reglas del repositorio (carpetas, ramas, PR y privacidad) están en [AGENTS.md](./AGENTS.md).

---

## 🌿 Flujo de Trabajo Git
* Cada integrante trabaja en su rama individual: `feature/nombre-sX`
* Pull Requests abiertos cada sábado.
* **Revisión y merge a la rama `main` todos los domingos a las 8:00 PM.**
