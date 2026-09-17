export default function HeroSection({ mode }) {
  const isRegister = mode === "registro";

  const subtitle = isRegister
    ? "Únete a la red donde tus habilidades se transforman en soluciones. Comparte tu conocimiento y accede al talento de otros profesionales."
    : "Conecta, comparte y accede a las habilidades que necesitas, sin importar tu profesión o experiencia.";

  return (
    <section className="flex flex-col justify-between py-2 lg:py-4 max-w-xl mx-auto md:mx-0 w-full space-y-4 lg:space-y-6">
      {/* Cabecera / Logo */}
      <header className="flex items-center gap-3">
        <a href="/" className="flex items-center gap-3" aria-label="Capacita inicio">
          <div className="relative flex items-center justify-center w-11 h-11 rounded-2xl bg-gradient-to-tr from-blue-600 via-indigo-600 to-cyan-400 shadow-md shadow-blue-500/25 ring-4 ring-white/90">
            <div className="w-4 h-4 rounded-full bg-white translate-x-0.5 shadow-sm"></div>
            <div className="w-4 h-4 rounded-full bg-cyan-200/95 -translate-x-0.5 mix-blend-screen"></div>
          </div>
          <span className="text-2xl font-black tracking-tight text-slate-900 font-sans">
            Capacita
          </span>
        </a>
      </header>

      {/* Título, subtítulo y badges */}
      <div className="space-y-6">
        <div className="space-y-3">
          <h1 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold tracking-tight text-slate-900 leading-[1.14]">
            Tu talento también
            <br />
            es una{" "}
            <span className="bg-gradient-to-r from-blue-600 via-indigo-600 to-cyan-500 bg-clip-text text-transparent">
              capacidad
            </span>
          </h1>
          <p className="text-sm sm:text-base text-slate-600 font-normal leading-relaxed font-body transition-opacity duration-300 min-h-[3rem]">
            {subtitle}
          </p>
        </div>

        {/* Gráfico decorativo de conexiones y píldoras */}
        <div className="relative py-1 select-none">
          <svg
            className="absolute inset-0 w-full h-full pointer-events-none opacity-45"
            fill="none"
            preserveAspectRatio="none"
            viewBox="0 0 400 120"
          >
            <path
              d="M 40 25 C 120 25, 160 80, 260 85"
              stroke="url(#grad-line-1)"
              strokeDasharray="3 3"
              strokeWidth="1.5"
            />
            <path
              d="M 140 30 C 200 8, 280 15, 360 40"
              stroke="url(#grad-line-2)"
              strokeDasharray="4 4"
              strokeWidth="1.2"
            />
            <path
              d="M 80 95 C 180 90, 220 30, 310 32"
              stroke="url(#grad-line-3)"
              strokeWidth="1"
            />
            <defs>
              <linearGradient id="grad-line-1" x1="0%" x2="100%" y1="0%" y2="100%">
                <stop offset="0%" stopColor="#3b82f6" />
                <stop offset="100%" stopColor="#06b6d4" />
              </linearGradient>
              <linearGradient id="grad-line-2" x1="0%" x2="100%" y1="0%" y2="100%">
                <stop offset="0%" stopColor="#6366f1" />
                <stop offset="100%" stopColor="#3b82f6" />
              </linearGradient>
              <linearGradient id="grad-line-3" x1="0%" x2="100%" y1="100%" y2="0%">
                <stop offset="0%" stopColor="#06b6d4" />
                <stop offset="100%" stopColor="#8b5cf6" />
              </linearGradient>
            </defs>
          </svg>

          <div className="flex flex-wrap items-center gap-2 relative z-10">
            <div className="pillar-card inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-white/95 backdrop-blur-md border border-blue-100 shadow-sm shadow-blue-500/10 cursor-pointer hover:border-blue-300 hover:bg-white transition-all">
              <span className="h-2 w-2 rounded-full bg-blue-500 ring-2 ring-blue-100"></span>
              <span className="text-xs font-semibold text-slate-800 font-sans">
                Diseño UX
              </span>
              <span className="text-[11px] text-blue-600 font-bold">⇄</span>
              <span className="text-xs font-semibold text-indigo-600 font-sans">
                Machine Learning
              </span>
            </div>

            <div className="pillar-card inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-white/95 backdrop-blur-md border border-cyan-100 shadow-sm shadow-cyan-500/10 cursor-pointer hover:border-cyan-300 hover:bg-white transition-all">
              <span className="h-2 w-2 rounded-full bg-cyan-500 ring-2 ring-cyan-100"></span>
              <span className="text-xs font-semibold text-slate-800 font-sans">
                Estrategia
              </span>
              <span className="text-[11px] text-cyan-600 font-bold">⇄</span>
              <span className="text-xs font-semibold text-blue-700 font-sans">
                Desarrollo Web
              </span>
            </div>

            <div className="pillar-card inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-white/95 backdrop-blur-md border border-indigo-100 shadow-sm shadow-indigo-500/10 cursor-pointer hover:border-indigo-300 hover:bg-white transition-all">
              <span className="h-2 w-2 rounded-full bg-indigo-500 ring-2 ring-indigo-100"></span>
              <span className="text-xs font-semibold text-slate-800 font-sans">
                Data
              </span>
              <span className="text-[11px] text-indigo-500 font-bold">⇄</span>
              <span className="text-xs font-semibold text-slate-700 font-sans">
                Creatividad
              </span>
            </div>

            {/* Píldora extra visible de manera dinámica según el modo */}
            {isRegister && (
              <div className="pillar-card inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-white/95 backdrop-blur-md border border-cyan-100 shadow-sm shadow-cyan-500/10 cursor-pointer hover:border-cyan-300 hover:bg-white transition-all animate-fadeIn">
                <span className="h-2 w-2 rounded-full bg-cyan-500 ring-2 ring-cyan-100"></span>
                <span className="text-xs font-semibold text-slate-800 font-sans">
                  Frontend
                </span>
                <span className="text-[11px] text-cyan-600 font-bold">⇄</span>
                <span className="text-xs font-semibold text-blue-700 font-sans">
                  IA
                </span>
              </div>
            )}
          </div>
        </div>

        {/* Tarjeta de métricas y actividad en vivo */}
        <div className="pillar-card p-4 sm:p-5 rounded-2xl bg-white/90 backdrop-blur-md border border-white shadow-soft space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="flex -space-x-2 overflow-hidden">
                <img
                  alt="Talento en línea"
                  className="inline-block h-7 w-7 rounded-full ring-2 ring-white object-cover"
                  src="https://lh3.googleusercontent.com/aida-public/AB6AXuBOUZ7n2MJnXHzi3fmxjZaOqY7zQlgcBjdnwjWWuP8SgUBR-fIROmPtChhF8JBBuk-8Ws5d4cJCLlPeIrKA2-BsH5Fkh2s-e5AmYXWlhSwGo6j6AQ-Ki7neYGQGLX1EFLbqLEeLcUQkCpnPWyHh3gEH5JB9uuXVeLS_Pblkj4xjy4eKD-XCTEt_9PYWHtRZCrR3MR8Vt5eEYpo50yza_ySI9U4k4O0zPI6hLFjNQI4onRx_2JkvQr7D"
                />
                <img
                  alt="Talento en línea"
                  className="inline-block h-7 w-7 rounded-full ring-2 ring-white object-cover"
                  src="https://lh3.googleusercontent.com/aida-public/AB6AXuCNSnits05ln1q7SCHtdbvH15NLeU27PSQaKTuaS3z-fy5mSRSzGrcVYIdrriyE8nTiqZp2gmwqcTa_AvF6Q91pAu-MBAuDBN2isR7BYJwzFMF4ullpHhp-U7VAilNLaMLaOCeR4BNIUd4-T4gqudGy_eVcyaSWuMfO6S5LbKRg0kFCvM6r7UbJndO76eOZyDN0zx-_zS_KLJinu7YYMw_I-O2sEmJDNlvawhN5jnjRvgrjAVW5Kp7-"
                />
                <img
                  alt="Talento en línea"
                  className="inline-block h-7 w-7 rounded-full ring-2 ring-white object-cover"
                  src="https://lh3.googleusercontent.com/aida-public/AB6AXuCb1eSSof3FIkGhJbBRWmmVEJkTypNe7Ion4HIBOneVEm0aDRv6EuhQ-NZGpneozEquwcRwb9_m6n2NBCubk4e4wOpm0x86eFLvvwsDzGk9e41QMnpvvhkgo7fwTZMmXS3jzRs0Z6vtZIg03P92eiufNVQMOs_qq0bMI9I_XMfZMEY-T60mzwQWy9TRqWQ3LFQGTD2DvOIpAahlgdYinW-eAu9rLeYOqlBp4cfVB7LvGWn8g4TQq4mA"
                />
              </div>
              <div>
                <div className="flex items-center gap-1.5 text-xs font-bold text-slate-900 font-sans">
                  <span>+12.4k activos</span>
                  <span className="flex h-2 w-2 relative">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                  </span>
                </div>
                <p className="text-[11px] text-slate-500 font-body font-medium">
                  Red colaborativa sincronizada
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2 bg-blue-50/80 border border-blue-100 px-2.5 py-1 rounded-full">
              <svg
                className="w-12 h-4.5 text-blue-600"
                fill="none"
                stroke="currentColor"
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="2"
                viewBox="0 0 54 20"
              >
                <polyline points="2,15 12,12 22,16 32,8 42,11 52,4"></polyline>
              </svg>
              <span className="text-[11px] font-bold text-blue-600 font-sans">
                +38%
              </span>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-2 pt-2.5 border-t border-slate-100 text-xs">
            <div className="flex items-center gap-2 bg-slate-50/80 rounded-xl p-2">
              <div className="flex items-center justify-center w-6 h-6 rounded-lg bg-blue-100 text-blue-600 font-bold text-xs">
                <svg
                  className="w-3.5 h-3.5"
                  fill="none"
                  stroke="currentColor"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth="2"
                  viewBox="0 0 24 24"
                >
                  <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path>
                  <polyline points="22 4 12 14.01 9 11.01"></polyline>
                </svg>
              </div>
              <div>
                <div className="font-bold text-slate-900 font-sans text-xs">
                  99.4%
                </div>
                <div className="text-[10px] text-slate-500 font-body">
                  Conexiones exitosas
                </div>
              </div>
            </div>

            <div className="flex items-center gap-2 bg-slate-50/80 rounded-xl p-2">
              <div className="flex items-center justify-center w-6 h-6 rounded-lg bg-cyan-100 text-cyan-700 font-bold text-xs">
                <svg
                  className="w-3.5 h-3.5"
                  fill="none"
                  stroke="currentColor"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth="2"
                  viewBox="0 0 24 24"
                >
                  <path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z"></path>
                </svg>
              </div>
              <div>
                <div className="font-bold text-slate-900 font-sans text-xs">
                  +480
                </div>
                <div className="text-[10px] text-slate-500 font-body">
                  Intercambios hoy
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Pie del hero */}
      <footer className="pt-2 text-xs text-slate-400 font-medium font-body flex items-center gap-4">
        <span>© 2025 Capacita</span>
        <span className="w-1 h-1 rounded-full bg-slate-300"></span>
        <span>Comunidad colaborativa</span>
      </footer>
    </section>
  );
}
