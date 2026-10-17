import { useState, useRef, useEffect } from 'react';

export default function Navbar({ usuario, seccionActiva = 'inicio', onCambiarSeccion, onCerrarSesion }) {
  const [menuUsuarioAbierto, setMenuUsuarioAbierto] = useState(false);
  const [imgError, setImgError] = useState(false);
  const menuRef = useRef(null);

  const navLinks = [
    { id: 'inicio',       label: 'Inicio' },
    { id: 'comunidad',    label: 'Comunidad' },
    { id: 'capacidades',  label: 'Capacidades' },
    { id: 'workflows',    label: 'Workflows' },
  ];

  // Cerrar menú de usuario al hacer clic fuera
  useEffect(() => {
    function handleClickOutside(event) {
      if (menuRef.current && !menuRef.current.contains(event.target)) {
        setMenuUsuarioAbierto(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const nombreUsuario = usuario?.name || 'Usuario';
  const iniciales = nombreUsuario
    .split(' ')
    .filter(Boolean)
    .map((n) => n[0])
    .slice(0, 2)
    .join('')
    .toUpperCase() || 'U';

  const avatarUrl =
    usuario?.avatar_url ||
    `https://ui-avatars.com/api/?name=${encodeURIComponent(nombreUsuario)}&background=1a56db&color=fff&size=128&bold=true`;

  return (
    <header className="sticky top-0 z-30 h-16 bg-white border-b border-slate-200/80">
      <div className="max-w-7xl mx-auto h-full flex items-center justify-between px-4 sm:px-6 lg:px-8">
        
        {/* Izquierda: Logo y Enlaces */}
        <div className="flex items-center gap-8">
          {/* Logo Capacita */}
          <button
            onClick={() => onCambiarSeccion?.('inicio')}
            className="flex items-center gap-2.5 shrink-0 group focus:outline-none cursor-pointer"
            title="Ir a Inicio"
          >
            {/* Ícono azul estilizado igual al mockup */}
            <div className="w-8 h-8 rounded-lg bg-[#1a56db] flex items-center justify-center shadow-xs group-hover:bg-blue-700 transition-colors">
              <svg className="w-5 h-5 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.2} strokeLinecap="round" strokeLinejoin="round">
                <rect x="3" y="4" width="7" height="7" rx="1.5" />
                <rect x="14" y="13" width="7" height="7" rx="1.5" />
                <path d="M7 11v4a2 2 0 0 0 2 2h5" />
              </svg>
            </div>
            <span className="font-bold text-[18px] text-[#1a56db] tracking-tight">
              Capacita
            </span>
          </button>

          {/* Enlaces de Navegación */}
          <nav className="hidden md:flex items-center gap-7 h-16">
            {navLinks.map(({ id, label }) => {
              const activo = seccionActiva === id;
              return (
                <button
                  key={id}
                  onClick={() => onCambiarSeccion?.(id)}
                  className={`relative h-full flex items-center text-[14px] transition-colors focus:outline-none cursor-pointer ${
                    activo
                      ? 'text-[#1a56db] font-semibold'
                      : 'text-slate-600 hover:text-slate-900 font-medium'
                  }`}
                >
                  {label}
                  {activo && (
                    <span className="absolute bottom-0 left-0 right-0 h-[2.5px] bg-[#1a56db] rounded-t-full" />
                  )}
                </button>
              );
            })}
          </nav>
        </div>

        {/* Derecha: Buscador, Botón Crear y Avatar */}
        <div className="flex items-center gap-4">
          
          {/* Buscador */}
          <div className="relative w-56 sm:w-72 lg:w-80">
            <div className="relative flex items-center">
              <svg
                className="absolute left-3 w-4 h-4 text-slate-400 pointer-events-none"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z"
                />
              </svg>
              <input
                type="text"
                placeholder="Buscar capacidades, workflows..."
                className="w-full pl-9 pr-12 py-1.5 text-[13px] bg-slate-50/70 hover:bg-slate-100/60 focus:bg-white border border-slate-200/90 rounded-lg text-slate-700 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-[#1a56db] transition"
              />
              <span className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[10px] font-mono font-medium text-slate-500 bg-white border border-slate-200/90 rounded px-1.5 py-0.5 shadow-2xs">
                ⌘K
              </span>
            </div>
          </div>

          {/* Botón "+ Crear" arreglado */}
          <button
            onClick={() => onCambiarSeccion?.('workflows')}
            className="flex items-center gap-1.5 bg-[#1a56db] hover:bg-blue-700 active:scale-[0.98] text-white text-[13px] font-semibold px-3.5 py-2 rounded-lg transition-all shadow-xs shrink-0 cursor-pointer"
            title="Crear workflow o capacidad"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 4v16m8-8H4" />
            </svg>
            <span>Crear</span>
          </button>

          {/* Avatar del usuario con menú desplegable */}
          <div className="relative" ref={menuRef}>
            <button
              onClick={() => setMenuUsuarioAbierto((prev) => !prev)}
              className="flex items-center gap-2 rounded-full ring-2 ring-transparent hover:ring-blue-500/30 transition focus:outline-none cursor-pointer"
              aria-label="Menú de usuario"
              title={`Cuenta: ${nombreUsuario}`}
            >
              {!imgError && avatarUrl ? (
                <img
                  src={avatarUrl}
                  alt={nombreUsuario}
                  onError={() => setImgError(true)}
                  className="w-8 h-8 rounded-full object-cover border border-slate-200 shadow-xs"
                />
              ) : (
                <div className="w-8 h-8 rounded-full bg-[#1a56db] text-white text-xs font-bold flex items-center justify-center border border-slate-200 shadow-xs">
                  {iniciales}
                </div>
              )}
            </button>

            {/* Menú desplegable */}
            {menuUsuarioAbierto && (
              <div className="absolute right-0 mt-2 w-60 bg-white rounded-xl shadow-lg border border-slate-100 py-1.5 z-50 animate-in fade-in slide-in-from-top-1 duration-150">
                <div className="px-4 py-2.5 border-b border-slate-100 bg-slate-50/50">
                  <p className="text-sm font-bold text-slate-900 truncate">
                    {nombreUsuario}
                  </p>
                  <p className="text-xs text-slate-500 truncate">{usuario?.email}</p>
                  {usuario?.horas_balance !== undefined && (
                    <div className="mt-2 inline-flex items-center gap-1 text-[11px] font-semibold text-blue-700 bg-blue-50 px-2.5 py-0.5 rounded-full border border-blue-100">
                      <span>⏱ {usuario.horas_balance}h de balance</span>
                    </div>
                  )}
                </div>

                <button
                  onClick={() => {
                    setMenuUsuarioAbierto(false);
                    onCambiarSeccion?.('inicio');
                  }}
                  className="w-full text-left px-4 py-2 text-xs font-medium text-slate-700 hover:bg-slate-50 flex items-center gap-2.5 cursor-pointer transition-colors"
                >
                  <svg className="w-4 h-4 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
                  </svg>
                  Inicio
                </button>

                <button
                  onClick={() => {
                    setMenuUsuarioAbierto(false);
                    onCambiarSeccion?.('capacidades');
                  }}
                  className="w-full text-left px-4 py-2 text-xs font-medium text-slate-700 hover:bg-slate-50 flex items-center gap-2.5 cursor-pointer transition-colors"
                >
                  <svg className="w-4 h-4 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                  </svg>
                  Mis Capacidades
                </button>

                <button
                  onClick={() => {
                    setMenuUsuarioAbierto(false);
                    onCambiarSeccion?.('workflows');
                  }}
                  className="w-full text-left px-4 py-2 text-xs font-medium text-slate-700 hover:bg-slate-50 flex items-center gap-2.5 cursor-pointer transition-colors"
                >
                  <svg className="w-4 h-4 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16m-7 6h7" />
                  </svg>
                  Workflows
                </button>

                <button
                  onClick={() => {
                    setMenuUsuarioAbierto(false);
                    onCambiarSeccion?.('configuracion');
                  }}
                  className="w-full text-left px-4 py-2 text-xs font-medium text-slate-700 hover:bg-slate-50 flex items-center gap-2.5 cursor-pointer transition-colors"
                >
                  <svg className="w-4 h-4 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                  </svg>
                  Configuración
                </button>

                <div className="border-t border-slate-100 my-1"></div>

                <button
                  onClick={() => {
                    setMenuUsuarioAbierto(false);
                    onCerrarSesion?.();
                  }}
                  className="w-full text-left px-4 py-2 text-xs font-semibold text-red-600 hover:bg-red-50 flex items-center gap-2.5 cursor-pointer transition-colors"
                >
                  <svg className="w-4 h-4 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                  </svg>
                  Cerrar sesión
                </button>
              </div>
            )}
          </div>

        </div>

      </div>

      {/* Menú móvil inferior si la pantalla es reducida */}
      <div className="md:hidden flex items-center justify-around border-t border-slate-100 bg-white py-2 px-2">
        {navLinks.map(({ id, label }) => {
          const activo = seccionActiva === id;
          return (
            <button
              key={id}
              onClick={() => onCambiarSeccion?.(id)}
              className={`text-xs px-2.5 py-1 rounded-md transition cursor-pointer ${
                activo
                  ? 'text-[#1a56db] font-semibold bg-blue-50'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              {label}
            </button>
          );
        })}
      </div>
    </header>
  );
}