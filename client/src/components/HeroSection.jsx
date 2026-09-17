export default function HeroSection({ mode }) {
  const isRegister = mode === "registro";

  const subtitle = isRegister
    ? "Únete a la red donde tus habilidades se transforman en soluciones. Comparte tu conocimiento y accede al talento de otros profesionales."
    : "Conecta, comparte y accede a las habilidades que necesitas, sin importar tu profesión o experiencia.";

  return (
    <section className="flex flex-col justify-between py-4 max-w-xl mx-auto md:mx-0 w-full space-y-6">
      {/* Logotipo */}
      <header className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-2xl bg-blue-600 flex items-center justify-center text-white font-black text-xl shadow-md shadow-blue-500/30">
          C
        </div>
        <span className="text-2xl font-black text-slate-900 tracking-tight">Capacita</span>
      </header>

      {/* Título Principal */}
      <div className="space-y-4">
        <h1 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold text-slate-900 leading-tight">
          Tu talento también
          <br />
          es una{" "}
          <span className="bg-gradient-to-r from-blue-600 to-cyan-500 bg-clip-text text-transparent">
            capacidad
          </span>
        </h1>
        <p className="text-sm sm:text-base text-slate-600 leading-relaxed">
          {subtitle}
        </p>

        {/* Píldoras de Habilidades */}
        <div className="flex flex-wrap gap-2 pt-2">
          <span className="px-3.5 py-1.5 rounded-full bg-white border border-blue-100 shadow-sm text-xs font-semibold text-slate-800">
            🎨 Diseño UX <span className="text-blue-600 font-bold">⇄</span> 🤖 Machine Learning
          </span>
          <span className="px-3.5 py-1.5 rounded-full bg-white border border-cyan-100 shadow-sm text-xs font-semibold text-slate-800">
            📊 Estrategia <span className="text-cyan-600 font-bold">⇄</span> 💻 Desarrollo Web
          </span>
          <span className="px-3.5 py-1.5 rounded-full bg-white border border-indigo-100 shadow-sm text-xs font-semibold text-slate-800">
            📈 Data <span className="text-indigo-600 font-bold">⇄</span> 💡 Creatividad
          </span>
        </div>

        {/* Tarjeta de Métricas */}
        <div className="p-4 sm:p-5 rounded-2xl bg-white/90 border border-slate-100 shadow-sm space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="flex h-2.5 w-2.5 relative">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500"></span>
              </span>
              <span className="text-xs font-bold text-slate-900">+12.4k activos en la red</span>
            </div>
            <span className="text-xs font-bold text-blue-600 bg-blue-50 px-2.5 py-1 rounded-full">+38% hoy</span>
          </div>

          <div className="grid grid-cols-2 gap-3 pt-2 border-t border-slate-100 text-xs">
            <div className="bg-slate-50 p-2.5 rounded-xl">
              <p className="font-bold text-slate-900 text-sm">99.4%</p>
              <p className="text-[11px] text-slate-500">Conexiones exitosas</p>
            </div>
            <div className="bg-slate-50 p-2.5 rounded-xl">
              <p className="font-bold text-slate-900 text-sm">+480</p>
              <p className="text-[11px] text-slate-500">Intercambios hoy</p>
            </div>
          </div>
        </div>
      </div>

      {/* Pie de página */}
      <footer className="text-xs text-slate-400">
        © 2025 Capacita — Comunidad colaborativa
      </footer>
    </section>
  );
}
