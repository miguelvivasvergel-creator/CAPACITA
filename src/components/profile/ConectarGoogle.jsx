import { useEffect, useRef, useState } from 'react';
import Icono from '../common/Icono';
import { completarGoogle, desconectarGoogle, estadoGoogle, iniciarGoogle } from '../../services/google';

const BOTON = 'min-h-11 rounded-xl px-4 py-2 text-sm font-semibold disabled:opacity-50';
const ERRORES = { access_denied: 'Cancelaste el permiso en Google. No se conectó nada.', cancelado: 'No se completó la conexión con Google.' };

/**
 * Conectar Google: Google devuelve el navegador a #configuracion/google/<código>/<state>; aquí,
 * con la sesión de la persona, se termina la conexión (el backend consume su state de un solo uso).
 */
export default function ConectarGoogle() {
  const [estado, setEstado] = useState(null); // { available, linked, email, linked_at }
  const [ocupado, setOcupado] = useState(false);
  const [mensaje, setMensaje] = useState('');
  const [error, setError] = useState('');
  const hecho = useRef(false);

  useEffect(() => {
    let vivo = true;
    async function cargar() {
      const [, , ...partes] = window.location.hash.replace('#', '').split('/');
      const tipo = window.location.hash.split('/')[1] || '';
      // Una sola vez (también con StrictMode): el state de Google se puede usar una sola vez.
      if (!hecho.current && (tipo === 'google' || tipo.startsWith('google-error'))) {
        hecho.current = true;
        window.history.replaceState(window.history.state, '', '#configuracion');
        if (tipo === 'google' && partes.length >= 2) {
          setOcupado(true);
          try {
            const resultado = await completarGoogle(decodeURIComponent(partes[0]), decodeURIComponent(partes[1]));
            if (vivo) setMensaje(`Conectado con ${resultado.email}.`);
          } catch (causa) { if (vivo) setError(causa.message); } finally { if (vivo) setOcupado(false); }
        } else if (vivo) {
          setError(ERRORES[decodeURIComponent(partes[0] || '')] || ERRORES.cancelado);
        }
      }
      try { const valor = await estadoGoogle(); if (vivo) setEstado(valor); } catch (causa) { if (vivo) setError(causa.message); }
    }
    cargar();
    return () => { vivo = false; };
  }, []);

  async function conectar() {
    setOcupado(true); setError('');
    try { window.location.href = (await iniciarGoogle()).url; } catch (causa) { setError(causa.message); setOcupado(false); }
  }

  async function desconectar() {
    if (!window.confirm('¿Desconectar tu cuenta de Google? Capacita dejará de enviar correos, guardar en Drive y agendar por ti.')) return;
    setOcupado(true); setError(''); setMensaje('');
    try { await desconectarGoogle(); setEstado((old) => ({ ...old, linked: false, email: null })); setMensaje('Desconectado: también revoqué el permiso en Google.'); }
    catch (causa) { setError(causa.message); } finally { setOcupado(false); }
  }

  if (estado && !estado.available) return null;
  return <section className="mt-6 rounded-2xl border border-slate-200 bg-white p-5 shadow-soft" aria-label="Google">
    <h2 className="font-sans text-base font-extrabold tracking-tight text-slate-900">Google</h2>
    <p className="mb-3 font-body text-xs text-slate-500">Permite que tus procesos te envíen correos a ti mismo, guarden archivos en tu Drive (solo los que crea Capacita) y agenden en tu calendario. Cada envío necesita tu «Acepto».</p>
    {!estado && !error && <p className="text-sm text-slate-500">Consultando…</p>}
    {mensaje && <p role="status" className="mb-2 text-sm text-emerald-800">{mensaje}</p>}
    {estado?.linked && <div className="space-y-3">
      {!mensaje && <p className="text-sm text-emerald-800"><Icono nombre="ok" className="mr-1 inline h-4 w-4 align-[-3px]" />Conectado con {estado.email}.</p>}
      <button type="button" disabled={ocupado} onClick={desconectar} className={`${BOTON} border border-slate-300`}>Desconectar Google</button>
    </div>}
    {estado && !estado.linked && <button type="button" disabled={ocupado} onClick={conectar} className={`${BOTON} bg-blue-700 text-white`}>{ocupado ? 'Abriendo Google…' : 'Conectar Google'}</button>}
    {error && <p role="alert" className="mt-2 text-sm text-red-700">{error}</p>}
  </section>;
}
