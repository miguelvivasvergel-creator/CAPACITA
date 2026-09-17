import { useState } from "react";
import Sidebar from "./Sidebar";
import Header from "./Header";
import Capacidades from "./Capacidades";

export default function MainPage({ user, onLogout, showToast }) {
  // 1. Estado para la pestaña activa (por defecto "inicio")
  const [activeTab, setActiveTab] = useState("inicio");

  // 2. Estado para abrir/cerrar la barra lateral en móviles
  const [sidebarOpen, setSidebarOpen] = useState(false);

  // 3. Función al hacer clic en el botón "Usar" de cualquier capacidad
  const handleUsarCapacidad = (capacidad) => {
    if (showToast) {
      showToast(`Has seleccionado: "${capacidad.titulo}" (Próximamente disponible)`);
    }
  };

  return (
    <div className="min-h-screen bg-[#f8faff] flex font-sans text-slate-800">
      {/* Barra lateral de navegación */}
      <Sidebar
        activeTab={activeTab}
        onSelectTab={setActiveTab}
        isOpen={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
      />

      {/* Contenido principal */}
      <div className="flex-1 flex flex-col min-w-0 lg:pl-64">
        {/* Barra superior */}
        <Header
          user={user}
          onToggleSidebar={() => setSidebarOpen(!sidebarOpen)}
          onLogout={onLogout}
        />

        {/* Área dinámica según la pestaña activa */}
        <main className="flex-1 p-4 sm:p-6 lg:p-8">
          {/* Pestaña: INICIO */}
          {activeTab === "inicio" && (
            <div className="max-w-7xl mx-auto w-full space-y-6">
              {/* Tarjeta de bienvenida principal */}
              <div className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-100 shadow-sm space-y-4">
                <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-50 text-blue-600 text-xs font-bold">
                  <span className="w-2 h-2 rounded-full bg-blue-500 animate-pulse"></span>
                  PANEL PRINCIPAL
                </div>

                <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900">
                  ¡Hola de nuevo, {user?.name || "Usuario"}! 👋
                </h1>

                <p className="text-xs sm:text-sm text-slate-500 max-w-2xl">
                  Bienvenido a Capacita. Explora las herramientas de inteligencia artificial para transformar texto, imágenes, archivos y audios.
                </p>

                <div className="pt-2">
                  <button
                    type="button"
                    onClick={() => setActiveTab("capacidades")}
                    className="bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs sm:text-sm py-2.5 px-6 rounded-full transition shadow-md shadow-blue-500/20 cursor-pointer inline-flex items-center gap-2 active:scale-95"
                  >
                    <span>Explorar capacidades</span>
                    <span>→</span>
                  </button>
                </div>
              </div>

              {/* Tarjetas informativas de acceso rápido */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm space-y-1">
                  <span className="text-xs font-semibold text-blue-600">Herramientas</span>
                  <p className="text-2xl font-bold text-slate-900">9</p>
                  <p className="text-[11px] text-slate-400">Capacidades activas</p>
                </div>

                <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm space-y-1">
                  <span className="text-xs font-semibold text-cyan-600">Categorías</span>
                  <p className="text-2xl font-bold text-slate-900">5</p>
                  <p className="text-[11px] text-slate-400">Texto, Imagen, PDF, Audio, Datos</p>
                </div>

                <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm space-y-1">
                  <span className="text-xs font-semibold text-indigo-600">Estado</span>
                  <p className="text-2xl font-bold text-emerald-600">En línea</p>
                  <p className="text-[11px] text-slate-400">Servicios disponibles</p>
                </div>
              </div>
            </div>
          )}

          {/* Pestaña: CAPACIDADES */}
          {activeTab === "capacidades" && (
            <Capacidades
              onUsarCapacidad={handleUsarCapacidad}
              showToast={showToast}
            />
          )}

          {/* Pestaña: CREAR CAPACIDAD (Abre Capacidades con el modal de creación activo) */}
          {activeTab === "crear_capacidad" && (
            <Capacidades
              onUsarCapacidad={handleUsarCapacidad}
              showToast={showToast}
              modalAbiertoInicial={true}
            />
          )}

          {/* Otras pestañas (Workflows, Historial, etc. en desarrollo) */}
          {activeTab !== "inicio" && activeTab !== "capacidades" && activeTab !== "crear_capacidad" && (
            <div className="max-w-7xl mx-auto w-full bg-white rounded-3xl p-10 border border-slate-100 shadow-sm text-center py-16 space-y-3">
              <h2 className="text-lg font-bold text-slate-800 capitalize">
                Sección {activeTab.replace("_", " ")}
              </h2>
              <p className="text-xs text-slate-500 max-w-sm mx-auto">
                Esta sección estará disponible próximamente. Puedes continuar explorando el catálogo de capacidades.
              </p>
              <button
                type="button"
                onClick={() => setActiveTab("capacidades")}
                className="text-xs text-blue-600 font-bold hover:underline cursor-pointer pt-2 inline-block"
              >
                ← Ir a Capacidades
              </button>
            </div>
          )}
        </main>
      </div>
    </div>
  );
}
