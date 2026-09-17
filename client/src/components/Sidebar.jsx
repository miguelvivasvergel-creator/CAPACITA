export default function Sidebar({ activeTab, onSelectTab, isOpen, onClose }) {
  // Lista de opciones del menú
  const items = [
    { id: "inicio", label: "Inicio", icon: "🏠" },
    { id: "capacidades", label: "Capacidades", icon: "⚡" },
    { id: "workflow", label: "Workflows", icon: "🔄" },
    { id: "crear_capacidad", label: "Crear capacidad", icon: "➕" },
    { id: "historial", label: "Historial", icon: "🕒" },
    { id: "estadisticas", label: "Estadísticas", icon: "📊" },
    { id: "perfil", label: "Perfil", icon: "👤" },
    { id: "configuracion", label: "Configuración", icon: "⚙️" },
  ];

  return (
    <>
      {/* Fondo oscuro al abrir menú en móviles */}
      {isOpen && (
        <div
          className="fixed inset-0 bg-slate-900/30 z-40 lg:hidden"
          onClick={onClose}
        />
      )}

      {/* Menú lateral */}
      <aside
        className={`fixed top-0 bottom-0 left-0 z-50 w-64 bg-white border-r border-slate-100 p-5 flex flex-col justify-between transition-transform duration-200 lg:translate-x-0 ${
          isOpen ? "translate-x-0 shadow-xl" : "-translate-x-full lg:translate-x-0"
        }`}
      >
        <div className="space-y-6">
          {/* Logo y título */}
          <div className="flex items-center justify-between px-2">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-blue-600 flex items-center justify-center text-white font-bold text-sm">
                C
              </div>
              <span className="text-lg font-bold text-slate-900">Capacita</span>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="p-1 text-slate-400 hover:text-slate-600 lg:hidden cursor-pointer text-xs"
            >
              ✕
            </button>
          </div>

          {/* Lista de navegación con .map() */}
          <nav className="space-y-1">
            {items.map((item) => {
              const isActive = activeTab === item.id;
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => {
                    onSelectTab(item.id);
                    onClose();
                  }}
                  className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-xs sm:text-sm font-semibold transition cursor-pointer ${
                    isActive
                      ? "bg-blue-50 text-blue-600 font-bold"
                      : "text-slate-600 hover:bg-slate-50 hover:text-slate-900"
                  }`}
                >
                  <span className="text-base">{item.icon}</span>
                  <span>{item.label}</span>
                </button>
              );
            })}
          </nav>
        </div>
      </aside>
    </>
  );
}
