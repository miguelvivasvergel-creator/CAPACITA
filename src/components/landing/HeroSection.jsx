import Marca from '../common/Marca';
import Icono from '../common/Icono';
export default function HeroSection({ modo }) {
  const textoSubtitulo =
    modo === 'registro'
      ? 'Únete a la red donde tus habilidades se transforman en soluciones. Comparte tu conocimiento y accede al talento de otros profesionales.'
      : 'Conecta, comparte y accede a las habilidades que necesitas, sin importar tu profesión o experiencia.';

  return (
    <section className="flex flex-col justify-between py-2 lg:py-4 max-w-xl mx-auto md:mx-0 w-full space-y-4 lg:space-y-6">
      <header className="flex items-center gap-3">
        <a href="/" className="flex items-center gap-3" aria-label="Capacita inicio"><Marca/></a>
      </header>

      <div className="space-y-6">
        <div className="space-y-3">
          <h1 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold tracking-tight text-slate-900 leading-[1.14]">
            Tu talento también<br />
            es una <span className="bg-gradient-to-r from-blue-600 via-indigo-600 to-cyan-500 bg-clip-text text-transparent">capacidad</span>
          </h1>
          <p className="text-sm sm:text-base text-slate-600 font-normal leading-relaxed font-body transition-opacity duration-300">
            {textoSubtitulo}
          </p>
        </div>

        <div className="relative py-1 select-none">
          <svg className="absolute inset-0 w-full h-full pointer-events-none opacity-45" fill="none" preserveAspectRatio="none" viewBox="0 0 400 120">
            <path d="M 40 25 C 120 25, 160 80, 260 85" stroke="url(#grad-line-1)" strokeDasharray="3 3" strokeWidth="1.5"></path>
            <path d="M 140 30 C 200 8, 280 15, 360 40" stroke="url(#grad-line-2)" strokeDasharray="4 4" strokeWidth="1.2"></path>
            <path d="M 80 95 C 180 90, 220 30, 310 32" stroke="url(#grad-line-3)" strokeWidth="1"></path>
            <defs>
              <linearGradient id="grad-line-1" x1="0%" x2="100%" y1="0%" y2="100%">
                <stop offset="0%" stopColor="#3b82f6"></stop>
                <stop offset="100%" stopColor="#06b6d4"></stop>
              </linearGradient>
              <linearGradient id="grad-line-2" x1="0%" x2="100%" y1="0%" y2="100%">
                <stop offset="0%" stopColor="#6366f1"></stop>
                <stop offset="100%" stopColor="#3b82f6"></stop>
              </linearGradient>
              <linearGradient id="grad-line-3" x1="0%" x2="100%" y1="100%" y2="0%">
                <stop offset="0%" stopColor="#06b6d4"></stop>
                <stop offset="100%" stopColor="#8b5cf6"></stop>
              </linearGradient>
            </defs>
          </svg>

          <div className="flex flex-wrap items-center gap-2 relative z-10">
            <div className="pillar-card inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-white/95 backdrop-blur-md border border-blue-100 shadow-sm shadow-blue-500/10 cursor-pointer hover:border-blue-300 hover:bg-white transition-all">
              <span className="h-2 w-2 rounded-full bg-blue-500 ring-2 ring-blue-100"></span>
              <span className="text-xs font-semibold text-slate-800 font-sans">Diseño UX</span>
              <span className="text-[11px] text-blue-600 font-bold">⇄</span>
              <span className="text-xs font-semibold text-indigo-600 font-sans">Machine Learning</span>
            </div>

            <div className="pillar-card inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-white/95 backdrop-blur-md border border-cyan-100 shadow-sm shadow-cyan-500/10 cursor-pointer hover:border-cyan-300 hover:bg-white transition-all">
              <span className="h-2 w-2 rounded-full bg-cyan-500 ring-2 ring-cyan-100"></span>
              <span className="text-xs font-semibold text-slate-800 font-sans">Estrategia</span>
              <span className="text-[11px] text-cyan-600 font-bold">⇄</span>
              <span className="text-xs font-semibold text-blue-700 font-sans">Desarrollo Web</span>
            </div>

            <div className="pillar-card inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-white/95 backdrop-blur-md border border-indigo-100 shadow-sm shadow-indigo-500/10 cursor-pointer hover:border-indigo-300 hover:bg-white transition-all">
              <span className="h-2 w-2 rounded-full bg-indigo-500 ring-2 ring-indigo-100"></span>
              <span className="text-xs font-semibold text-slate-800 font-sans">Data</span>
              <span className="text-[11px] text-indigo-500 font-bold">⇄</span>
              <span className="text-xs font-semibold text-slate-700 font-sans">Creatividad</span>
            </div>

            {modo === 'registro' && (
              <div className="pillar-card inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-white/95 backdrop-blur-md border border-cyan-100 shadow-sm shadow-cyan-500/10 cursor-pointer hover:border-cyan-300 hover:bg-white transition-all animate-fadeIn">
                <span className="h-2 w-2 rounded-full bg-cyan-500 ring-2 ring-cyan-100"></span>
                <span className="text-xs font-semibold text-slate-800 font-sans">Frontend</span>
                <span className="text-[11px] text-cyan-600 font-bold">⇄</span>
                <span className="text-xs font-semibold text-blue-700 font-sans">IA</span>
              </div>
            )}
          </div>
        </div>

        <div className="rounded-2xl border border-white bg-white/85 p-5 shadow-soft">
          <div className="flex items-center gap-3"><span className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-50 text-blue-600"><Icono nombre="soluciones"/></span><div><p className="text-sm font-bold text-slate-800">Conecta capacidades. Resuelve objetivos.</p><p className="mt-1 text-xs leading-relaxed text-slate-500">Encuentra herramientas, combina soluciones y crea lo que falta.</p></div></div>
          <div className="mt-4 flex flex-wrap gap-4 border-t border-slate-100 pt-3 text-[11px] text-slate-500">{[['buscar','Describe tu necesidad'],['soluciones','Revisa la propuesta'],['resultados','Obtén el resultado']].map(([icono,label])=><span key={label} className="inline-flex items-center gap-1.5"><Icono nombre={icono} className="h-3.5 w-3.5 text-blue-500"/>{label}</span>)}</div>
        </div>
      </div>

      <footer className="pt-2 text-xs text-slate-400 font-medium font-body flex items-center gap-4">
        <span>Capacita</span>
        <span className="w-1 h-1 rounded-full bg-slate-300"></span>
        <span>Conecta capacidades</span>
      </footer>
    </section>
  );
}
