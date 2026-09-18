import { useState } from 'react';

export default function RegisterForm({ onIrLogin, onGoogleClick, onRegisterExitoso }) {
  const [fullname, setFullname] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [skill, setSkill] = useState('');
  const [terms, setTerms] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [errores, setErrores] = useState({});

  const handleSubmit = (e) => {
    e.preventDefault();
    const nuevosErrores = {};

    if (!fullname.trim()) {
      nuevosErrores.fullname = 'Ingresa tu nombre completo.';
    }

    if (!email.trim()) {
      nuevosErrores.email = 'Ingresa un correo electrónico.';
    } else if (!email.includes('@') || !email.includes('.')) {
      nuevosErrores.email = 'El formato de correo no es válido.';
    }

    if (!password || password.length < 8) {
      nuevosErrores.password = 'La contraseña debe tener mínimo 8 caracteres.';
    }

    if (!terms) {
      nuevosErrores.terms = 'Debes aceptar los términos y condiciones.';
    }

    setErrores(nuevosErrores);

    if (Object.keys(nuevosErrores).length === 0) {
      onRegisterExitoso({ fullname, email, password, skill });
    }
  };

  return (
    <div className="space-y-3">
      <div className="space-y-1">
        <span className="inline-flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wider text-blue-600 bg-blue-50/90 border border-blue-100 px-3 py-1 rounded-full shadow-sm">
          <span className="w-1.5 h-1.5 rounded-full bg-blue-500 animate-pulse"></span>
          CREA TU CUENTA GRATIS
        </span>
        <h2 className="text-xl sm:text-2xl font-extrabold text-slate-900 tracking-tight">
          Crea tu cuenta
        </h2>
        <p className="text-xs text-slate-500 font-normal font-body">
          Comienza a conectar tus capacidades con el mundo.
        </p>
      </div>

      <button
        type="button"
        onClick={onGoogleClick}
        className="boton-google-accion w-full flex items-center justify-center gap-3 py-2 px-5 rounded-full bg-white hover:bg-slate-50 text-xs sm:text-sm font-semibold text-slate-700 border border-slate-200/90 transition active:scale-[0.99] cursor-pointer shadow-sm font-body"
      >
        <svg className="w-5 h-5 shrink-0" width="20" height="20" viewBox="0 0 24 24">
          <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"></path>
          <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"></path>
          <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z" fill="#FBBC05"></path>
          <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z" fill="#EA4335"></path>
        </svg>
        <span>Continuar con Google</span>
      </button>

      <div className="relative my-0.5">
        <div aria-hidden="true" className="absolute inset-0 flex items-center">
          <div className="w-full border-t border-slate-200/80"></div>
        </div>
        <div className="relative flex justify-center text-[11px]">
          <span className="bg-white/95 text-slate-400 font-medium font-body px-3 py-0.5 rounded-full border border-slate-100 shadow-sm">
            o regístrate con tu correo
          </span>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-2" noValidate>
        <div className="space-y-0.5">
          <label className="block text-[11px] font-semibold text-slate-700 tracking-wide" htmlFor="fullname">
            Nombre completo
          </label>
          <div className="relative">
            <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3.5 text-slate-400">
              <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.8"></path>
              </svg>
            </div>
            <input
              id="fullname"
              type="text"
              value={fullname}
              onChange={(e) => {
                setFullname(e.target.value);
                if (errores.fullname) setErrores({ ...errores, fullname: '' });
              }}
              placeholder="Ej. Sofía Martínez"
              className={`vivid-input block w-full rounded-2xl pl-10 pr-4 py-2 text-xs sm:text-sm text-slate-900 placeholder-slate-400 font-body ${errores.fullname ? 'is-invalid' : ''}`}
            />
          </div>
          <small className="mensaje-error">{errores.fullname || ''}</small>
        </div>

        <div className="space-y-0.5">
          <label className="block text-[11px] font-semibold text-slate-700 tracking-wide" htmlFor="emailRegistro">
            Correo electrónico
          </label>
          <div className="relative">
            <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3.5 text-slate-400">
              <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.8"></path>
              </svg>
            </div>
            <input
              id="emailRegistro"
              type="email"
              value={email}
              onChange={(e) => {
                setEmail(e.target.value);
                if (errores.email) setErrores({ ...errores, email: '' });
              }}
              placeholder="tu@correo.com"
              className={`vivid-input block w-full rounded-2xl pl-10 pr-4 py-2 text-xs sm:text-sm text-slate-900 placeholder-slate-400 font-body ${errores.email ? 'is-invalid' : ''}`}
            />
          </div>
          <small className="mensaje-error">{errores.email || ''}</small>
        </div>

        <div className="space-y-0.5">
          <label className="block text-[11px] font-semibold text-slate-700 tracking-wide" htmlFor="passwordRegistro">
            Contraseña
          </label>
          <div className="relative">
            <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3.5 text-slate-400">
              <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.8"></path>
              </svg>
            </div>
            <input
              id="passwordRegistro"
              type={showPassword ? 'text' : 'password'}
              value={password}
              onChange={(e) => {
                setPassword(e.target.value);
                if (errores.password) setErrores({ ...errores, password: '' });
              }}
              placeholder="Mínimo 8 caracteres"
              className={`vivid-input block w-full rounded-2xl pl-10 pr-11 py-2 text-xs sm:text-sm text-slate-900 placeholder-slate-400 font-body ${errores.password ? 'is-invalid' : ''}`}
            />
            <button
              type="button"
              aria-label="Mostrar u ocultar contraseña"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-slate-400 hover:text-slate-700 transition cursor-pointer"
            >
              {showPassword ? (
                <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.8" d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l18 18" />
                </svg>
              ) : (
                <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.8" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.8" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                </svg>
              )}
            </button>
          </div>
          <small className="mensaje-error">{errores.password || ''}</small>
        </div>

        <div className="space-y-0.5">
          <label className="block text-[11px] font-semibold text-slate-700 tracking-wide" htmlFor="skill">
            Habilidad principal o área de interés <span className="text-slate-400 font-normal">(opcional)</span>
          </label>
          <div className="relative">
            <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3.5 text-slate-400">
              <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path d="M13 10V3L4 14h7v7l9-11h-7z" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.8"></path>
              </svg>
            </div>
            <input
              id="skill"
              type="text"
              value={skill}
              onChange={(e) => setSkill(e.target.value)}
              placeholder="Ej. Diseño UI/UX, Python..."
              className="vivid-input block w-full rounded-2xl pl-10 pr-4 py-2 text-xs sm:text-sm text-slate-900 placeholder-slate-400 font-body"
            />
          </div>
        </div>

        <div className="pt-0.5 font-body">
          <label className="flex items-start gap-2 cursor-pointer select-none">
            <input
              id="terms"
              type="checkbox"
              checked={terms}
              onChange={(e) => {
                setTerms(e.target.checked);
                if (errores.terms) setErrores({ ...errores, terms: '' });
              }}
              className="h-3.5 w-3.5 mt-0.5 rounded border-slate-300 text-blue-600 focus:ring-blue-500 bg-white transition cursor-pointer"
            />
            <span className="text-[11px] text-slate-600 leading-normal">
              Acepto los <a className="text-blue-600 font-semibold hover:underline" href="#">Términos</a> y <a className="text-blue-600 font-semibold hover:underline" href="#">Privacidad</a>.
            </span>
          </label>
          {errores.terms && <small className="mensaje-error">{errores.terms}</small>}
        </div>

        <button
          type="submit"
          className="w-full mt-1.5 flex items-center justify-center gap-2 py-2.5 px-6 rounded-full text-white boton-primario active:scale-[0.99] font-bold text-xs sm:text-sm shadow-md shadow-blue-500/25 transition duration-150 cursor-pointer"
        >
          <span>Crear cuenta gratis</span>
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path d="M14 5l7 7m0 0l-7 7m7-7H3" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2"></path>
          </svg>
        </button>
      </form>

      <p className="text-center text-xs text-slate-500 pt-0.5 font-normal font-body">
        ¿Ya tienes una cuenta?
        <button
          type="button"
          onClick={onIrLogin}
          className="text-blue-600 font-bold hover:text-blue-700 hover:underline transition ml-1 cursor-pointer"
        >
          Inicia sesión
        </button>
      </p>
    </div>
  );
}
