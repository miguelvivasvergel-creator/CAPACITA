import { useState, useEffect } from "react";
import { loginUsuario } from "../services/supabase";

export default function LoginForm({ onSwitchToRegister, showToast, onLoginSuccess, registeredUser }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);

  // Si viene de registrarse, rellenar el correo automáticamente
  useEffect(() => {
    if (registeredUser?.email) {
      setEmail(registeredUser.email);
    }
  }, [registeredUser]);

  const handleSubmit = async (e) => {
    e.preventDefault();

    // Validaciones básicas
    if (!email.trim()) {
      showToast("Ingresa tu correo electrónico.");
      return;
    }
    if (!password) {
      showToast("Ingresa tu contraseña.");
      return;
    }

    setLoading(true);
    const result = await loginUsuario({ email, password });
    setLoading(false);

    if (result.success) {
      showToast(`¡Bienvenido, ${result.data.name}!`);
      if (onLoginSuccess) {
        onLoginSuccess(result.data);
      }
    } else {
      showToast(result.error || "Error al iniciar sesión.");
    }
  };

  const handleGoogleLogin = () => {
    showToast("Sesión iniciada con Google.");
    if (onLoginSuccess) {
      onLoginSuccess({
        name: "Usuario Google",
        email: "google.user@capacita.com",
      });
    }
  };

  return (
    <div className="space-y-4">
      {/* Encabezado */}
      <div>
        <span className="text-[11px] font-bold text-blue-600 bg-blue-50 px-3 py-1 rounded-full border border-blue-100">
          BIENVENIDO DE NUEVO
        </span>
        <h2 className="text-2xl sm:text-3xl font-extrabold text-slate-900 mt-2">
          Inicia sesión
        </h2>
        <p className="text-xs sm:text-sm text-slate-500">
          Accede a tu cuenta para continuar en Capacita.
        </p>
      </div>

      {/* Formulario */}
      <form onSubmit={handleSubmit} className="space-y-3">
        {/* Campo Correo */}
        <div className="space-y-1">
          <label className="text-xs font-semibold text-slate-700">Correo electrónico</label>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="tu@correo.com"
            className="w-full px-4 py-2.5 rounded-2xl bg-white border border-slate-200 text-sm text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
          />
        </div>

        {/* Campo Contraseña */}
        <div className="space-y-1">
          <label className="text-xs font-semibold text-slate-700">Contraseña</label>
          <div className="relative">
            <input
              type={showPassword ? "text" : "password"}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              className="w-full px-4 pr-12 py-2.5 rounded-2xl bg-white border border-slate-200 text-sm text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-xs text-slate-400 hover:text-slate-600 cursor-pointer"
            >
              {showPassword ? "Ocultar" : "Mostrar"}
            </button>
          </div>
        </div>

        {/* Botón Iniciar Sesión */}
        <button
          type="submit"
          disabled={loading}
          className="w-full mt-2 bg-blue-600 hover:bg-blue-700 text-white font-bold text-sm py-3 rounded-full transition shadow-md shadow-blue-500/25 active:scale-98 cursor-pointer disabled:opacity-75"
        >
          {loading ? "Verificando..." : "Iniciar sesión →"}
        </button>
      </form>

      {/* Botón Google */}
      <button
        type="button"
        onClick={handleGoogleLogin}
        className="w-full py-2.5 px-4 rounded-full bg-white hover:bg-slate-50 text-xs sm:text-sm font-semibold text-slate-700 border border-slate-200 transition active:scale-98 cursor-pointer shadow-sm flex items-center justify-center gap-2"
      >
        <span>Continuar con Google</span>
      </button>

      {/* Enlace a Registro */}
      <p className="text-center text-xs text-slate-500 pt-1">
        ¿No tienes una cuenta?{" "}
        <button
          type="button"
          onClick={onSwitchToRegister}
          className="text-blue-600 font-bold hover:underline cursor-pointer"
        >
          Regístrate
        </button>
      </p>
    </div>
  );
}
