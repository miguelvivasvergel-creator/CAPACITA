export default function Comunidad({ _usuario }) {
  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-10">
      <div className="pb-6 border-b border-slate-200/80">
        <h1 className="text-3xl font-bold tracking-tight text-slate-900">
          Comunidad Capacita
        </h1>
        <p className="mt-2 text-base text-slate-600">
          Conecta con profesionales, intercambia talentos y descubre pipelines compartidos por otros miembros.
        </p>
      </div>

      <div className="my-8 rounded-2xl border border-slate-200 p-8 text-center bg-white shadow-xs">
        <div className="w-12 h-12 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center mx-auto mb-3 font-bold text-xl">
          👥
        </div>
        <h3 className="text-lg font-bold text-slate-800">
          Espacio de Comunidad
        </h3>
        <p className="mt-1 text-sm text-slate-500 max-w-md mx-auto">
          Próximamente podrás interactuar directamente con otros creadores, publicar ofertas de intercambio y valorar flujos de trabajo.
        </p>
      </div>
    </div>
  );
}
