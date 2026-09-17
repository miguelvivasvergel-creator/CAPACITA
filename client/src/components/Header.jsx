import { useState, useRef, useEffect } from "react";

export default function Header({ user, onToggleSidebar }) {
  const [openUser, setOpenUser] = useState(false);
  const [openNotif, setOpenNotif] = useState(false);
  const userRef = useRef(null);
  const notifRef = useRef(null);

  useEffect(() => {
    function handleClickOutside(e) {
      if (userRef.current && !userRef.current.contains(e.target)) setOpenUser(false);
      if (notifRef.current && !notifRef.current.contains(e.target)) setOpenNotif(false);
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  return (
    <header className="sticky top-0 z-30 w-full bg-white border-b border-slate-100 px-4 sm:px-8 py-3 flex items-center justify-between">
      <button
        type="button"
        onClick={onToggleSidebar}
        className="p-2 rounded-lg text-slate-500 hover:bg-slate-100 lg:hidden cursor-pointer"
      >
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 6h16M4 12h16M4 18h16" />
        </svg>
      </button>

      <div className="flex items-center gap-3 ml-auto">
        <div className="relative" ref={notifRef}>
          <button
            type="button"
            onClick={() => {
              setOpenNotif(!openNotif);
              setOpenUser(false);
            }}
            className="relative p-2 rounded-full text-slate-500 hover:bg-slate-100 transition cursor-pointer"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.8" d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
            </svg>
            <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-rose-500"></span>
          </button>

          {openNotif && (
            <div className="absolute right-0 mt-2 w-64 bg-white rounded-xl shadow-lg border border-slate-100 p-3 z-50 text-xs">
              <div className="font-bold text-slate-700 pb-2 border-b border-slate-100">Notificaciones</div>
              <p className="pt-2 text-slate-500">Sin notificaciones pendientes</p>
            </div>
          )}
        </div>

        <div className="relative" ref={userRef}>
          <button
            type="button"
            onClick={() => {
              setOpenUser(!openUser);
              setOpenNotif(false);
            }}
            className="flex items-center gap-2 p-1 rounded-full hover:bg-slate-100 transition cursor-pointer"
          >
            <img
              src={user?.avatar || "https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=150&h=150&q=80"}
              alt={user?.name || "Usuario"}
              className="w-8 h-8 rounded-full object-cover"
            />
            <span className="text-sm font-semibold text-slate-800 hidden sm:inline-block">
              {user?.name || "Miguel Vivas"}
            </span>
            <svg
              className={`w-4 h-4 text-slate-400 transition ${openUser ? "rotate-180" : ""}`}
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" />
            </svg>
          </button>

          {openUser && (
            <div className="absolute right-0 mt-2 w-44 bg-white rounded-xl shadow-lg border border-slate-100 p-2 z-50 text-xs">
              <p className="px-3 py-1.5 font-bold text-slate-900 truncate">{user?.name || "Miguel Vivas"}</p>
              <p className="px-3 pb-2 text-slate-400 truncate border-b border-slate-100">{user?.email || "miguel@gmail.com"}</p>
              <button
                type="button"
                onClick={() => setOpenUser(false)}
                className="w-full text-left px-3 py-1.5 mt-1 rounded-md text-slate-700 hover:bg-slate-50 cursor-pointer"
              >
                Perfil
              </button>
              <button
                type="button"
                onClick={() => setOpenUser(false)}
                className="w-full text-left px-3 py-1.5 rounded-md text-slate-700 hover:bg-slate-50 cursor-pointer"
              >
                Configuración
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
