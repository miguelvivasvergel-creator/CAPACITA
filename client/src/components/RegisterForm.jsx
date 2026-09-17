import { useState } from "react";
import { registrarUsuario } from "../services/supabase";

export default function RegisterForm({ onSwitchToLogin, showToast, onRegisterSuccess }) {
  const [fullname, setFullname] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [terms, setTerms] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();

    // 1. Validaciones sencillas
    if (!fullname.trim() || fullname.trim().length < 3) {
      showToast("Ingresa un nombre de al menos 3 caracteres.");
      return;
    }
    if (!email.trim() || !email.includes("@")) {
      showToast("Ingresa un correo electrónico válido.");
      return;
    }
    if (!password || password.length < 6) {
      showToast("La contraseña debe tener al menos 6 caracteres.");
      return;
    }
    if (!terms) {
      showToast("Debes aceptar los términos y condiciones.");
      return;
    }

    // 2. Registro en Supabase
    setLoading(true);
    const result = await registrarUsuario({
      nombre: fullname.trim(),
      email: email.trim(),
      password: password,
    });
    setLoading(false);

    // 3. Respuesta
    if (result.success) {
      const nombreUsuario = fullname.trim();
      const correoUsuario = email.trim();
      showToast(`¡Cuenta creada con éxito! Bienvenido, ${nombreUsuario}`);

      // Limpiar formulario
      setFullname("");
      setEmail("");
      setPassword("");
      setTerms(false);

      // Iniciar sesión directamente con el nombre registrado
      setTimeout(() => {
        if (onRegisterSuccess) {
          onRegisterSuccess({ name: nombreUsuario, email: correoUsuario });
        } else {
          onSwitchToLogin({ name: nombreUsuario, email: correoUsuario });
        }
      }, 1000);
    } else {
      showToast("Error: " + result.error);
    }
  };

  const handleGoogleLogin = () => {
    showToast("Acceso con Google listo para conectar en backend.");
  };

  return (
    <div className="space-y-4">
      {/* Encabezado */}
      <div>
        <span className="text-[11px] font-bold text-blue-600 bg-blue-50 px-3 py-1 rounded-full border border-blue-100">
          CREA TU CUENTA GRATIS
        </span>
        <h2 className="text-2xl sm:text-3xl font-extrabold text-slate-900 mt-2">
          Crea tu cuenta
        </h2>
        <p className="text-xs sm:text-sm text-slate-500">
          Comienza a conectar tus capacidades con el mundo.
        </p>
      </div>

      {/* Formulario */}
      <form onSubmit={handleSubmit} className="space-y-3">
        {/* Nombre completo */}
        <div className="space-y-1">
          <label className="text-xs font-semibold text-slate-700">Nombre completo</label>
          <input
            type="text"
            value={fullname}
            onChange={(e) => setFullname(e.target.value)}
            placeholder="Ej. Sofía Martínez"
            className="w-full px-4 py-2 text-sm rounded-2xl bg-white border border-slate-200 text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
          />
        </div>

        {/* Correo electrónico */}
        <div className="space-y-1">
          <label className="text-xs font-semibold text-slate-700">Correo electrónico</label>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="tu@correo.com"
            className="w-full px-4 py-2 text-sm rounded-2xl bg-white border border-slate-200 text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
          />
        </div>

        {/* Contraseña */}
        <div className="space-y-1">
          <label className="text-xs font-semibold text-slate-700">Contraseña</label>
          <div className="relative">
            <input
              type={showPassword ? "text" : "password"}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Mínimo 6 caracteres"
              className="w-full px-4 pr-12 py-2 text-sm rounded-2xl bg-white border border-slate-200 text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
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

        {/* Términos y condiciones */}
        <label className="flex items-center gap-2 text-xs text-slate-600 cursor-pointer pt-1">
          <input
            type="checkbox"
            checked={terms}
            onChange={(e) => setTerms(e.target.checked)}
            className="h-3.5 w-3.5 rounded border-slate-300 text-blue-600 focus:ring-blue-500 cursor-pointer"
          />
          <span>Acepto los términos y privacidad.</span>
        </label>

        {/* Botón Crear Cuenta */}
        <button
          type="submit"
          disabled={loading}
          className="w-full mt-2 bg-blue-600 hover:bg-blue-700 text-white font-bold text-sm py-2.5 rounded-full transition shadow-md shadow-blue-500/25 active:scale-98 cursor-pointer disabled:opacity-75"
        >
          {loading ? "Creando cuenta..." : "Crear cuenta gratis →"}
        </button>
      </form>

      {/* Botón Google */}
      <button
        type="button"
        onClick={handleGoogleLogin}
        className="w-full py-2 px-4 rounded-full bg-white hover:bg-slate-50 text-xs sm:text-sm font-semibold text-slate-700 border border-slate-200 transition active:scale-98 cursor-pointer shadow-sm flex items-center justify-center gap-2"
      >
        <span>Continuar con Google</span>
      </button>

      {/* Volver a Iniciar Sesión */}
      <p className="text-center text-xs text-slate-500 pt-1">
        ¿Ya tienes una cuenta?{" "}
        <button
          type="button"
          onClick={onSwitchToLogin}
          className="text-blue-600 font-bold hover:underline cursor-pointer"
        >
          Inicia sesión
        </button>
      </p>
    </div>
  );
}
