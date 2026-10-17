// src/pages/Capacidades/CapacidadesLayout.jsx
import CapacidadesSubNav from '../../components/capabilities/CapacidadesSubNav';

export default function CapacidadesLayout({
  seccion,
  onCambiarSeccion,
  totalMis = 0,
  totalComunidad = 6,
  onNuevaCapacidad,
  children,
}) {
  return (
    <div className="min-h-screen bg-slate-50 flex flex-col justify-between">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 w-full">
        {/* Encabezado sin el badge azul de Frame 1 */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl sm:text-4xl font-extrabold text-slate-900 tracking-tight">
              Capacidades
            </h1>
            <p className="text-xs sm:text-sm text-slate-500 mt-1">
              Acciones digitales que puedes usar en tus workflows modulares
            </p>
          </div>

          <button
            type="button"
            onClick={onNuevaCapacidad}
            className="inline-flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs sm:text-sm px-5 py-2.5 rounded-full transition shadow-md shadow-blue-500/25 active:scale-[0.99] self-start sm:self-auto cursor-pointer"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 4v16m8-8H4" />
            </svg>
            <span>+ Nueva capacidad</span>
          </button>
        </div>

        {/* Barra de pestañas: Únicamente Mis capacidades y Comunidad */}
        <CapacidadesSubNav
          seccion={seccion}
          onCambiar={onCambiarSeccion}
          totalMis={totalMis}
          totalComunidad={totalComunidad}
        />

        {/* Contenido principal */}
        <main>{children}</main>
      </div>

      {/* Footer inferior */}
      <footer className="w-full border-t border-slate-200 bg-white py-4 px-6 text-xs text-slate-400 mt-12">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-3">
          <p>
            <strong className="text-slate-700 font-semibold">Capacita</strong> © 2025 Capacita • Plataforma de automatización modular
          </p>
          <div className="flex items-center gap-5">
            <a href="#" className="hover:text-blue-600 transition">Documentación de nodos</a>
            <a href="#" className="hover:text-blue-600 transition">API & Webhooks</a>
            <a href="#" className="hover:text-blue-600 transition">Políticas de seguridad</a>
          </div>
        </div>
      </footer>
    </div>
  );
}