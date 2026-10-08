// src/components/layout/Navbar.jsx
export default function Navbar({ usuario, seccionActiva, onCambiarSeccion }) {
  const navLinks = [
    { id: 'inicio',       label: 'Inicio' },
    { id: 'comunidad',    label: 'Comunidad' },
    { id: 'capacidades',  label: 'Capacidades' },
    { id: 'workflows',    label: 'Workflows' },
  ];

  // Iniciales del nombre para el avatar
  const iniciales = usuario?.name
    ? usuario.name.split(' ').map((n) => n[0]).slice(0, 2).join('').toUpperCase()
    : '?';

  return (
    <header className="sticky top-0 z-20 h-14 bg-white border-b border-slate-200 shadow-sm">
      <div className="max-w-7xl mx-auto h-full flex items-center gap-6 px-4">

        {/* Logo */}
        <a href="#" className="flex items-center gap-2 shrink-0">
          <div className="w-7 h-7 rounded-lg bg-blue-600 flex items-center justify-center">
            <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.2}
                d="M13 10V3L4 14h7v7l9-11h-7z" />
            </svg>
          </div>
          <span className="font-bold text-slate-900 text-[15px] tracking-tight">Capacita</span>
        </a>

        {/* Nav links */}
        <nav className="flex items-center gap-1">
          {navLinks.map(({ id, label }) => (
            <button
              key={id}
              onClick={() => onCambiarSeccion && onCambiarSeccion(id)}
              className={`px-3 py-1.5 rounded-full text-sm font-medium transition-colors ${
                seccionActiva === id
                  ? 'text-blue-600 bg-blue-50 font-semibold'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
              }`}
            >
              {label}
            </button>
          ))}
        </nav>

        {/* Buscador */}
        <div className="flex-1 max-w-sm">
          <div className="relative">
            <svg
              className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400"
              fill="none" stroke="currentColor" viewBox="0 0 24 24"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8}
                d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z" />
            </svg>
            <input
              type="text"
              placeholder="Buscar capacidades, workflows, usuarios"
              className="w-full pl-9 pr-14 py-1.5 text-sm rounded-full bg-slate-100 border border-slate-200 text-slate-700 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-400 transition"
            />
            <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[10px] text-slate-400 bg-white border border-slate-200 rounded px-1.5 py-0.5 font-mono">
              ⌘K
            </span>
          </div>
        </div>

        {/* Botón Crear */}
        <button className="flex items-center gap-1.5 bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold px-4 py-1.5 rounded-full transition shadow-sm shadow-blue-500/30 shrink-0">
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 4v16m8-8H4" />
          </svg>
          Crear
        </button>

        {/* Avatar + nombre de usuario */}
        <div className="flex items-center gap-2 shrink-0 cursor-pointer group">
          {/* Avatar con iniciales o foto */}
          {usuario?.avatar_url ? (
            <img
              src={usuario.avatar_url}
              alt={usuario.name}
              className="w-8 h-8 rounded-full object-cover ring-2 ring-slate-200"
            />
          ) : (
            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center text-white text-xs font-bold ring-2 ring-slate-200">
              {iniciales}
            </div>
          )}
          <span className="text-sm font-semibold text-slate-800 group-hover:text-blue-600 transition hidden sm:block">
            {usuario?.name || 'Usuario'}
          </span>
        </div>

      </div>
    </header>
  );
}