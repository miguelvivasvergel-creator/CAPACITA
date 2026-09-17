import { useState, useRef, useEffect } from "react";

export default function Header({ user, onToggleSidebar, onLogout }) {
  const [openUser, setOpenUser] = useState(false);
  const [openNotif, setOpenNotif] = useState(false);
  const dropdownRef = useRef(null);

  // Cerrar menús desplegables al hacer clic afuera
  useEffect(() => {
    function handleClickOutside(e) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setOpenUser(false);
        setOpenNotif(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  return (
    <header className="sticky top-0 z-30 w-full bg-white border-b border-slate-100 px-4 sm:px-8 py-3 flex items-center justify-between">
      {/* Botón menú móvil */}
      <button
        type="button"
        onClick={onToggleSidebar}
        className="p-2 rounded-lg text-slate-500 hover:bg-slate-100 lg:hidden cursor-pointer"
      >
        ☰
      </button>

      {/* Menú de usuario y notificaciones */}
      <div className="flex items-center gap-3 ml-auto" ref={dropdownRef}>
        {/* Notificaciones */}
        <div className="relative">
          <button
            type="button"
            onClick={() => {
              setOpenNotif(!openNotif);
              setOpenUser(false);
            }}
            className="p-2 rounded-full text-slate-500 hover:bg-slate-100 transition cursor-pointer text-sm"
          >
            🔔
          </button>

          {openNotif && (
            <div className="absolute right-0 mt-2 w-60 bg-white rounded-2xl shadow-lg border border-slate-100 p-3 z-50 text-xs">
              <p className="font-bold text-slate-800 pb-2 border-b border-slate-100">Notificaciones</p>
              <p className="pt-2 text-slate-500">Sin notificaciones pendientes</p>
            </div>
          )}
        </div>

        {/* Perfil de Usuario */}
        <div className="relative">
          <button
            type="button"
            onClick={() => {
              setOpenUser(!openUser);
              setOpenNotif(false);
            }}
            className="flex items-center gap-2 p-1.5 rounded-full hover:bg-slate-100 transition cursor-pointer"
          >
            <img
              src={user?.avatar || "https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=150&h=150&q=80"}
              alt="Avatar"
              className="w-8 h-8 rounded-full object-cover"
            />
            <span className="text-sm font-semibold text-slate-800 hidden sm:inline-block">
              {user?.name || "Usuario"}
            </span>
          </button>

          {openUser && (
            <div className="absolute right-0 mt-2 w-48 bg-white rounded-2xl shadow-lg border border-slate-100 p-2 z-50 text-xs space-y-1">
              <p className="px-3 py-1 font-bold text-slate-900 truncate">{user?.name || "Usuario"}</p>
              <p className="px-3 pb-2 text-slate-400 truncate border-b border-slate-100">{user?.email || ""}</p>
              
              <button
                type="button"
                onClick={() => {
                  setOpenUser(false);
                  if (onLogout) onLogout();
                }}
                className="w-full text-left px-3 py-1.5 rounded-xl text-rose-600 hover:bg-rose-50 cursor-pointer font-semibold"
              >
                Cerrar sesión
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
