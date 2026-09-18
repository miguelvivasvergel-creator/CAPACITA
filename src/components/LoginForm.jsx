import { useState } from 'react';

export default function LoginForm({ onIrRegistro, onGoogleClick, onLoginExitoso }) {
  const [correo, setCorreo] = useState('');
  const [contrasena, setContrasena] = useState('');
  const [recordarme, setRecordarme] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [errores, setErrores] = useState({});

  const handleSubmit = (e) => {
    e.preventDefault();
    const nuevosErrores = {};

    if (!correo.trim()) {
      nuevosErrores.correo = 'Por favor, ingresa tu correo.';
    } else if (!correo.includes('@') || !correo.includes('.')) {
      nuevosErrores.correo = 'Ingresa un correo electrónico válido.';
    }

    if (!contrasena) {
      nuevosErrores.contrasena = 'Por favor, ingresa tu contraseña.';
    }

    setErrores(nuevosErrores);

    if (Object.keys(nuevosErrores).length === 0) {
      onLoginExitoso({ correo, contrasena, recordarme });
    }
  };

  return (
    <div className="space-y-4">
      <div className="space-y-1">
        <span className="inline-flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wider text-blue-600 bg-blue-50/90 border border-blue-100 px-3 py-1 rounded-full shadow-sm">
          <span className="w-1.5 h-1.5 rounded-full bg-blue-500 animate-pulse"></span>
          BIENVENIDO DE NUEVO
        </span>
        <h2 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
          Inicia sesión
        </h2>
        <p className="text-xs sm:text-sm text-slate-500 font-normal font-body">
          Accede a tu cuenta para continuar.
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-3" noValidate>
        <div className="space-y-1">
          <label className="block text-xs font-semibold text-slate-700 tracking-wide" htmlFor="correo">
            Correo electrónico
          </label>
          <div className="relative">
            <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-4 text-slate-400">
              <svg className="h-4.5 w-4.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2-0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.8"></path>
              </svg>
            </div>
            <input
              id="correo"
              type="email"
              value={correo}
              onChange={(e) => {
                setCorreo(e.target.value);
                if (errores.correo) setErrores({ ...errores, correo: '' });
              }}
              placeholder="tu@correo.com"
              className={`vivid-input block w-full rounded-2xl pl-11 pr-4 py-2.5 text-sm text-slate-900 placeholder-slate-400 font-body ${errores.correo ? 'is-invalid' : ''}`}
            />
          </div>
          <small className="mensaje-error">{errores.correo || ''}</small>
        </div>

        <div className="space-y-1">
          <label className="block text-xs font-semibold text-slate-700 tracking-wide" htmlFor="contrasena">
            Contraseña
          </label>
          <div className="relative">
            <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-4 text-slate-400">
              <svg className="h-4.5 w-4.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.8"></path>
              </svg>
            </div>
            <input
              id="contrasena"
              type={showPassword ? 'text' : 'password'}
              value={contrasena}
              onChange={(e) => {
                setContrasena(e.target.value);
                if (errores.contrasena) setErrores({ ...errores, contrasena: '' });
              }}
              placeholder="••••••••"
              className={`vivid-input block w-full rounded-2xl pl-11 pr-12 py-2.5 text-sm text-slate-900 placeholder-slate-400 font-body ${errores.contrasena ? 'is-invalid' : ''}`}
            />
            <button
              type="button"
              aria-label="Mostrar u ocultar contraseña"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute inset-y-0 right-0 pr-4 flex items-center text-slate-400 hover:text-slate-700 transition cursor-pointer"
            >
              {showPassword ? (
                <svg className="h-4.5 w-4.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.8" d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l18 18" />
                </svg>
              ) : (
                <svg className="h-4.5 w-4.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.8" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.8" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                </svg>
              )}
            </button>
          </div>
          <small className="mensaje-error">{errores.contrasena || ''}</small>
        </div>

        <div className="flex items-center justify-between pt-1 font-body">
          <label className="flex items-center gap-2 cursor-pointer select-none">
            <input
              type="checkbox"
              checked={recordarme}
              onChange={(e) => setRecordarme(e.target.checked)}
              className="h-4 w-4 rounded-md border-slate-300 text-blue-600 focus:ring-blue-500 bg-white transition cursor-pointer"
            />
            <span className="text-xs font-medium text-slate-600">Recordarme</span>
          </label>
          <a href="#" className="text-xs font-semibold text-blue-600 hover:text-blue-700 hover:underline transition">
            ¿Olvidaste tu contraseña?
          </a>
        </div>

        <button
          type="submit"
          className="w-full mt-2 flex items-center justify-center gap-2 py-3 px-6 rounded-full text-white boton-primario active:scale-[0.99] font-bold text-sm shadow-md shadow-blue-500/25 transition duration-150 cursor-pointer"
        >
          <span>Iniciar sesión</span>
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path d="M14 5l7 7m0 0l-7 7m7-7H3" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2"></path>
          </svg>
        </button>
      </form>

      <div className="relative my-2">
        <div aria-hidden="true" className="absolute inset-0 flex items-center">
          <div className="w-full border-t border-slate-200/80"></div>
        </div>
        <div className="relative flex justify-center text-xs">
          <span className="bg-white/95 text-slate-400 font-medium font-body px-3.5 py-0.5 rounded-full border border-slate-100 shadow-sm">
            o continúa con
          </span>
        </div>
      </div>

      <button
        type="button"
        onClick={onGoogleClick}
        className="boton-google-accion w-full flex items-center justify-center gap-3 py-2.5 px-5 rounded-full bg-white hover:bg-slate-50 text-xs sm:text-sm font-semibold text-slate-700 border border-slate-200/90 transition active:scale-[0.99] cursor-pointer shadow-sm font-body"
      >
        <svg className="w-5 h-5 shrink-0" width="20" height="20" viewBox="0 0 24 24">
          <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"></path>
          <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"></path>
          <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z" fill="#FBBC05"></path>
          <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z" fill="#EA4335"></path>
        </svg>
        <span>Continuar con Google</span>
      </button>

      <p className="text-center text-xs text-slate-500 pt-1 font-normal font-body">
        ¿No tienes una cuenta?
        <button
          type="button"
          onClick={onIrRegistro}
          className="text-blue-600 font-bold hover:text-blue-700 hover:underline transition ml-1 cursor-pointer"
        >
          Regístrate
        </button>
      </p>
    </div>
  );
}
