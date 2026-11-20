import { useState } from 'react';
import Icono from '../common/Icono';
import { api } from '../../api';

const BOTON = 'min-h-11 rounded-xl px-4 py-2 text-sm font-semibold disabled:opacity-50';

/**
 * Compartir con la comunidad desde el chat (usa la publicación B6 existente).
 * Se publica la definición y se permite ejecutar la versión probada; el código,
 * los reportes y los datos de las ejecuciones siguen privados.
 */
export default function CompartirHerramienta({ version }) {
  const [abierta, setAbierta] = useState(false);
  const [licencia, setLicencia] = useState('MIT');
  const [consentimiento, setConsentimiento] = useState(false);
  const [publicacion, setPublicacion] = useState(null); // id de la publicación activa
  const [ocupado, setOcupado] = useState(false);
  const [error, setError] = useState('');

  async function accion(tarea) {
    setOcupado(true); setError('');
    try { await tarea(); } catch (cause) { setError(cause.message); } finally { setOcupado(false); }
  }

  const buscarPublicacion = async () => {
    const pagina = await api(`/publications?capability_id=${encodeURIComponent(version.capability_id)}`);
    return pagina.items.find((fila) => fila.id === version.id)?.publication_id || null;
  };

  const abrir = () => accion(async () => {
    const disponible = await api('/publications/availability');
    if (!disponible.enabled) throw new Error('Compartir todavía no está activado en este entorno. Tu herramienta sigue disponible para ti.');
    setPublicacion(await buscarPublicacion());
    setAbierta(true);
  });

  const publicar = () => accion(async () => {
    await api('/publications', { method: 'POST', body: { version_id: version.id, license: licencia, consent: true } });
    setPublicacion(await buscarPublicacion()); setConsentimiento(false);
  });

  const retirar = () => accion(async () => {
    if (!window.confirm('¿Dejar de compartirla? Nadie nuevo podrá usarla; el historial se conserva.')) return;
    await api(`/publications/${encodeURIComponent(publicacion)}/withdraw`, { method: 'POST' });
    setPublicacion(null);
  });

  if (!abierta) return <div className="mt-3">
    <button type="button" disabled={ocupado} onClick={abrir} className={`${BOTON} border border-blue-300 bg-blue-50 text-blue-800`}><Icono nombre="comunidad" className="mr-1 inline h-4 w-4 align-[-3px]" />Compartir con la comunidad</button>
    {error && <p role="alert" className="mt-2 break-words text-sm text-red-700">{error}</p>}
  </div>;

  return <div className="mt-3 space-y-2 rounded-xl border border-blue-200 bg-blue-50/50 p-3 text-sm">
    {publicacion ? <>
      <p className="font-semibold text-blue-900"><Icono nombre="comunidad" className="mr-1 inline h-4 w-4 align-[-3px]" />Compartida: otras cuentas ya pueden encontrarla y usarla con sus propios datos.</p>
      <p className="text-xs text-slate-600">Tu código, tus resultados y los datos de quienes la usen siguen privados.</p>
      <button type="button" disabled={ocupado} onClick={retirar} className={`${BOTON} border border-slate-300 bg-white`}>Dejar de compartir</button>
    </> : <>
      <p className="font-semibold">Compartir esta herramienta</p>
      <p className="text-slate-600">Se publican su nombre, descripción, contratos y ejemplos, y otras cuentas podrán ejecutarla. El código, los reportes y tus datos siguen privados.</p>
      <label className="block font-semibold">Licencia
        <select className="mt-1 min-h-11 w-full rounded-lg border bg-white p-2 font-normal" disabled={ocupado} value={licencia} onChange={(event) => { setLicencia(event.target.value); setConsentimiento(false); }}>
          <option value="MIT">MIT (libre, con crédito al autor)</option>
          <option value="Apache-2.0">Apache-2.0 (libre, con crédito y patentes)</option>
          <option value="CC0-1.0">CC0-1.0 (dominio público)</option>
        </select>
      </label>
      <label className="flex items-start gap-2"><input type="checkbox" className="mt-1" disabled={ocupado} checked={consentimiento} onChange={(event) => setConsentimiento(event.target.checked)} />Autorizo publicarla bajo esta licencia. Revisé que su descripción y ejemplos no tienen datos privados.</label>
      <button type="button" disabled={ocupado || !consentimiento} onClick={publicar} className={`${BOTON} bg-blue-700 text-white`}>{ocupado ? 'Publicando…' : 'Publicar'}</button>
    </>}
    {error && <p role="alert" className="break-words text-red-700">{error}</p>}
  </div>;
}
