import { useState } from 'react';
import { supabase } from '../services/supabase';

export default function Configuracion({ usuario, onCerrarSesion }) {
  const [correo, setCorreo] = useState(usuario?.email || '');
  const [nuevaContrasena, setNuevaContrasena] = useState('');
  const [mensaje, setMensaje] = useState('');
  const [cargando, setCargando] = useState(false);

  const mostrarMensaje = (texto) => {
    setMensaje(texto);
    setTimeout(() => setMensaje(''), 3500);
  };

  const handleCambiarCorreo = async (e) => {
    e.preventDefault();
    if (!correo.trim() || !correo.includes('@')) {
      mostrarMensaje('Ingresa un correo válido.');
      return;
    }
    setCargando(true);
    const { error } = await supabase.auth.updateUser({ email: correo.trim() });
    setCargando(false);
    if (error) {
      mostrarMensaje(`Error: ${error.message}`);
    } else {
      mostrarMensaje('Correo actualizado. Revisa tu bandeja para confirmar.');
    }
  };

  const handleCambiarContrasena = async (e) => {
    e.preventDefault();
    if (nuevaContrasena.length < 8) {
      mostrarMensaje('La contraseña debe tener mínimo 8 caracteres.');
      return;
    }
    setCargando(true);
    const { error } = await supabase.auth.updateUser({ password: nuevaContrasena });
    setCargando(false);
    if (error) {
      mostrarMensaje(`Error: ${error.message}`);
    } else {
      mostrarMensaje('Contraseña actualizada ✓');
      setNuevaContrasena('');
    }
  };

  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-10">

      {/* Encabezado estilo login */}
      <div className="pb-6 border-b border-slate-200/80 space-y-2">
        <span className="inline-flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wider text-blue-600 bg-blue-50/90 border border-blue-100 px-3 py-1 rounded-full shadow-sm">
          <span className="w-1.5 h-1.5 rounded-full bg-blue-500 animate-pulse"></span>
          AJUSTES DE LA CUENTA
        </span>
        <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight font-sans">
          Configuración
        </h1>
        <p className="text-xs sm:text-sm text-slate-500 font-normal font-body">
          Administra los datos de tu cuenta.
        </p>
      </div>

      {/* Mensaje */}
      {mensaje && (
        <div className="mt-4 bg-blue-50 border border-blue-200 text-blue-700 text-xs font-semibold font-body px-3 py-2 rounded-full inline-block">
          {mensaje}
        </div>
      )}

      {/* Cambiar correo */}
      <section className="mt-6 bg-white border border-slate-200 rounded-2xl p-5 shadow-soft">
        <h2 className="text-base font-extrabold text-slate-900 tracking-tight font-sans">
          Correo electrónico
        </h2>
        <p className="text-xs text-slate-500 font-body mb-3">
          Supabase enviará un enlace de confirmación al nuevo correo.
        </p>
        <form onSubmit={handleCambiarCorreo} className="flex flex-col sm:flex-row gap-2">
          <input
            type="email"
            value={correo}
            onChange={(e) => setCorreo(e.target.value)}
            className="vivid-input flex-1 rounded-2xl px-4 py-2.5 text-sm text-slate-900 placeholder-slate-400 font-body"
          />
          <button
            type="submit"
            disabled={cargando}
            className="boton-primario px-5 py-2.5 text-white text-sm font-semibold rounded-2xl cursor-pointer disabled:opacity-50 font-body"
          >
            Guardar correo
          </button>
        </form>
      </section>

      {/* Cambiar contraseña */}
      <section className="mt-4 bg-white border border-slate-200 rounded-2xl p-5 shadow-soft">
        <h2 className="text-base font-extrabold text-slate-900 tracking-tight font-sans">
          Cambiar contraseña
        </h2>
        <p className="text-xs text-slate-500 font-body mb-3">
          Mínimo 8 caracteres.
        </p>
        <form onSubmit={handleCambiarContrasena} className="flex flex-col sm:flex-row gap-2">
          <input
            type="password"
            value={nuevaContrasena}
            onChange={(e) => setNuevaContrasena(e.target.value)}
            placeholder="Nueva contraseña"
            className="vivid-input flex-1 rounded-2xl px-4 py-2.5 text-sm text-slate-900 placeholder-slate-400 font-body"
          />
          <button
            type="submit"
            disabled={cargando}
            className="boton-primario px-5 py-2.5 text-white text-sm font-semibold rounded-2xl cursor-pointer disabled:opacity-50 font-body"
          >
            Guardar contraseña
          </button>
        </form>
      </section>

      {/* Cerrar sesión */}
      <section className="mt-4 bg-white border border-slate-200 rounded-2xl p-5 shadow-soft">
        <h2 className="text-base font-extrabold text-slate-900 tracking-tight font-sans">
          Sesión
        </h2>
        <p className="text-xs text-slate-500 font-body mb-3">
          Cierra sesión en este dispositivo.
        </p>
        <button
          onClick={onCerrarSesion}
          className="px-5 py-2.5 bg-white hover:bg-red-50 border border-red-200 text-red-600 text-sm font-semibold rounded-2xl cursor-pointer transition-colors font-body"
        >
          Cerrar sesión
        </button>
      </section>
    </div>
  );
}
