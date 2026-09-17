import { useState } from "react";
import Sidebar from "./Sidebar";
import Header from "./Header";

export default function MainPage({ user, onLogout, showToast }) {
  // Estado para la pestaña activa
  const [activeTab, setActiveTab] = useState("inicio");
  const [sidebarOpen, setSidebarOpen] = useState(false);

  return (
    <div className="min-h-screen bg-[#f8faff] flex font-sans text-slate-800">
      {/* Barra lateral */}
      <Sidebar
        activeTab={activeTab}
        onSelectTab={setActiveTab}
        isOpen={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
      />

      {/* Contenido principal */}
      <div className="flex-1 flex flex-col min-w-0 lg:pl-64">
        {/* Encabezado */}
        <Header
          user={user}
          onToggleSidebar={() => setSidebarOpen(!sidebarOpen)}
          onLogout={onLogout}
        />

        {/* Área dinámica */}
        <main className="flex-1 p-4 sm:p-6 lg:p-8">
          {activeTab === "inicio" ? (
            <div className="max-w-7xl mx-auto w-full space-y-6">
              {/* Tarjeta de bienvenida */}
              <div className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-100 shadow-sm space-y-4">
                <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-50 text-blue-600 text-xs font-bold">
                  <span className="w-2 h-2 rounded-full bg-blue-500 animate-pulse"></span>
                  PANEL PRINCIPAL
                </div>

                <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900">
                  ¡Hola, {user?.name || "Usuario"}! 👋
                </h1>

                <p className="text-xs sm:text-sm text-slate-500 max-w-2xl">
                  Bienvenido a tu panel de Capacita. Selecciona una opción en el menú lateral para comenzar.
                </p>
              </div>
            </div>
          ) : (
            <div className="max-w-7xl mx-auto w-full bg-white rounded-3xl p-10 border border-slate-100 shadow-sm text-center py-16 space-y-3">
              <h2 className="text-lg font-bold text-slate-800 capitalize">
                Sección {activeTab.replace("_", " ")}
              </h2>
              <p className="text-xs text-slate-500 max-w-sm mx-auto">
                Esta sección se encuentra en desarrollo.
              </p>
              <button
                type="button"
                onClick={() => setActiveTab("inicio")}
                className="text-xs text-blue-600 font-bold hover:underline cursor-pointer pt-2 inline-block"
              >
                ← Volver al Inicio
              </button>
            </div>
          )}
        </main>
      </div>
    </div>
  );
}
