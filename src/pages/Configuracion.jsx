import EncabezadoVista from '../components/common/EncabezadoVista';
import { useEffect, useId, useRef, useState } from 'react';
import { supabase } from '../services/supabase';
import ConectarTelegram from '../components/profile/ConectarTelegram';
import ConectarGoogle from '../components/profile/ConectarGoogle';

export default function Configuracion({ usuario, onCerrarSesion }) {
  const [correo, setCorreo] = useState(usuario?.email || '');
  const [nuevaContrasena, setNuevaContrasena] = useState('');
  const [mensaje, setMensaje] = useState('');
  const [cargando, setCargando] = useState(false);
  const [esError, setEsError] = useState(false);
  const temporizador = useRef(null);
  const formId = useId();
  useEffect(() => () => clearTimeout(temporizador.current), []);

  const mostrarMensaje = (texto, error = false) => {
    clearTimeout(temporizador.current);
    setEsError(error);
    setMensaje(texto);
    temporizador.current = setTimeout(() => setMensaje(''), 7000);
  };

  const handleCambiarCorreo = async (e) => {
    e.preventDefault();
    if (!correo.trim() || !correo.includes('@')) {
      mostrarMensaje('Ingresa un correo válido.', true);
      return;
    }
    setCargando(true);
    try {
      const { error } = await supabase.auth.updateUser({ email: correo.trim() });
      if (error) mostrarMensaje(`Error: ${error.message}`, true);
      else mostrarMensaje('Cambio solicitado. Revisa los mensajes de confirmación antes de usar el nuevo correo.');
    } catch {
      mostrarMensaje('No se pudo contactar al servicio de cuentas. Comprueba tu conexión e inténtalo de nuevo.', true);
    } finally { setCargando(false); }
  };

  const handleCambiarContrasena = async (e) => {
    e.preventDefault();
    if (nuevaContrasena.length < 8) {
      mostrarMensaje('La contraseña debe tener mínimo 8 caracteres.', true);
      return;
    }
    setCargando(true);
    try {
      const { error } = await supabase.auth.updateUser({ password: nuevaContrasena });
      if (error) mostrarMensaje(`Error: ${error.message}`, true);
      else { mostrarMensaje('Contraseña actualizada.'); setNuevaContrasena(''); }
    } catch {
      mostrarMensaje('No se pudo contactar al servicio de cuentas. Comprueba tu conexión e inténtalo de nuevo.', true);
    } finally { setCargando(false); }
  };

  return (
    <div className="vista-contenedor vista-secundaria configuracion-vista">

      <EncabezadoVista icono="ajustes" etiqueta="Tu cuenta" titulo="Configuración" descripcion="Administra los datos y el acceso a tu cuenta."/>

      {mensaje && (
        <div role={esError ? 'alert' : 'status'} className={`mt-4 border text-xs font-semibold font-body px-3 py-2 rounded-xl ${esError ? 'bg-red-50 border-red-200 text-red-700' : 'bg-blue-50 border-blue-200 text-blue-700'}`}>
          {mensaje}
        </div>
      )}

      <ConectarTelegram />
      <ConectarGoogle />

      {/* Cambiar correo */}
      <section className="mt-6 bg-white border border-slate-200 rounded-2xl p-5 shadow-soft">
        <h2 className="text-base font-extrabold text-slate-900 tracking-tight font-sans">
          Correo electrónico
        </h2>
        <p className="text-xs text-slate-500 font-body mb-3">
          Revisa los correos de confirmación que solicite el servicio de cuentas.
        </p>
        <form onSubmit={handleCambiarCorreo} className="flex flex-col sm:flex-row gap-2">
          <label className="sr-only" htmlFor={`${formId}-email`}>Nuevo correo electrónico</label>
          <input
            id={`${formId}-email`}
            name="email"
            autoComplete="email"
            required
            disabled={cargando}
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
          <label className="sr-only" htmlFor={`${formId}-password`}>Nueva contraseña</label>
          <input
            id={`${formId}-password`}
            name="new-password"
            autoComplete="new-password"
            required
            minLength={8}
            disabled={cargando}
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
