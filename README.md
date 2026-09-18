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
* Node.js 18+ instalado
* npm o pnpm

### Pasos
1. Clonar el repositorio:
   ```bash
   git clone https://github.com/miguelvivasvergel-creator/CAPACITA.git
   cd CAPACITA
   ```

2. Instalar dependencias:
   ```bash
   npm install
   ```

3. Iniciar el servidor de desarrollo:
   ```bash
   npm run dev
   ```
   La aplicación estará disponible en `http://localhost:5173`.

4. Compilar para producción:
   ```bash
   npm run build
   ```

---

## 🌿 Flujo de Trabajo Git
* Cada integrante trabaja en su rama individual: `feature/nombre-sX`
* Pull Requests abiertos cada sábado.
* **Revisión y merge a la rama `main` todos los domingos a las 8:00 PM.**
