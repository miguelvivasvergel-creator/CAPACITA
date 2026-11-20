import { useState } from 'react';
import Icono from '../common/Icono';
import MiniCadena from '../common/MiniCadena';
import { api } from '../../api';

const BOTON = 'min-h-11 rounded-xl px-4 py-2 text-sm font-semibold disabled:opacity-50';

// Cómo funciona compartir, en tres nodos (mismo lenguaje visual del taller).
const RECORRIDO = [
  ['comunidad', 'Tú la compartes', 'Con licencia y tu visto bueno'],
  ['buscar', 'Otros la encuentran', 'En Comunidad y cuando el chat busca'],
  ['candado', 'La usan con sus datos', 'Sus datos y los tuyos siguen privados'],
];

const campos = (schema) => Object.entries(schema?.properties || {}).map(([clave, spec]) => spec?.title || clave);

/**
 * Compartir con la comunidad (usa la publicación B6 existente: POST /publications con licencia y
 * consentimiento). Se publica la definición y se permite ejecutar la versión probada; el código,
 * los reportes y los datos de las ejecuciones siguen privados. capacidad (opcional) permite
 * mostrar la vista previa de la ficha tal como la verán los demás.
 */
export default function CompartirHerramienta({ version, capacidad }) {
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

  if (!abierta) return <div className="mt-2">
    <button type="button" disabled={ocupado} onClick={abrir} className="compartir-boton"><Icono nombre="comunidad" className="h-4 w-4" />{ocupado ? 'Revisando…' : 'Compartir con la comunidad'}</button>
    {error && <p role="alert" className="mt-2 break-words text-sm text-red-700">{error}</p>}
  </div>;

  const entradas = campos(capacidad?.input_schema), salidas = campos(capacidad?.output_schema);
  return <div className="compartir-panel">
    <div className="flex items-start justify-between gap-2">
      <p className="compartir-titulo"><Icono nombre="comunidad" className="h-4 w-4" />{publicacion ? 'Compartida con la comunidad' : 'Compartir esta herramienta'}</p>
      <button type="button" className="rounded-lg p-1 text-slate-500 hover:bg-white" onClick={() => setAbierta(false)} aria-label="Cerrar"><Icono nombre="x" className="h-4 w-4" /></button>
    </div>
    <ol className="compartir-recorrido" aria-label="Cómo funciona compartir">
      {RECORRIDO.map(([icono, titulo, ayuda], index) => <li key={titulo} className={publicacion || index === 0 ? 'is-activo' : ''}>
        <span className="compartir-nodo"><Icono nombre={icono} className="h-3.5 w-3.5" /></span><strong>{titulo}</strong><span>{ayuda}</span>
      </li>)}
    </ol>
    {publicacion ? <>
      <p className="text-sm text-slate-700">Otras cuentas ya pueden encontrarla en Comunidad y usarla con sus propios datos. Quienes ya la usan siguen con esta misma versión probada.</p>
      <button type="button" disabled={ocupado} onClick={retirar} className={`${BOTON} border border-slate-300 bg-white`}>Dejar de compartir</button>
    </> : <>
      {capacidad && <div className="compartir-ficha" aria-label="Vista previa: así la verán los demás">
        <p className="compartir-ficha-etiqueta">Así la verán los demás</p>
        <div className="flex items-start gap-3">
          <span className="compartir-ficha-icono"><MiniCadena pasos={1} /></span>
          <div className="min-w-0">
            <p className="break-words font-semibold text-slate-900">{capacidad.name}</p>
            <p className="mt-1 break-words text-xs text-slate-600">{capacidad.description}</p>
          </div>
        </div>
        {(entradas.length > 0 || salidas.length > 0) && <p className="mt-3 break-words text-xs text-slate-600">
          <strong>Recibe:</strong> {entradas.join(', ') || 'nada'} <Icono nombre="flecha" className="mx-1 inline h-3 w-3 align-[-1px]" /> <strong>Entrega:</strong> {salidas.join(', ') || 'un resultado'}
        </p>}
        <p className="mt-2 text-xs text-slate-500">Con tu nombre de autor · licencia {licencia} · versión probada</p>
      </div>}
      <ul className="compartir-privado" aria-label="Lo que nunca se comparte">
        {['Tu código y sus reportes de pruebas', 'Tus archivos, datos y resultados', 'Tus cuentas conectadas (Telegram, Google): quien la use conecta las suyas']
          .map((texto) => <li key={texto}><Icono nombre="candado" className="h-3.5 w-3.5" />{texto}</li>)}
      </ul>
      <label className="block text-sm font-semibold text-slate-800">Licencia
        <select className="mt-1 min-h-11 w-full rounded-xl border bg-white p-2 font-normal" disabled={ocupado} value={licencia} onChange={(event) => { setLicencia(event.target.value); setConsentimiento(false); }}>
          <option value="MIT">MIT (libre, con crédito al autor)</option>
          <option value="Apache-2.0">Apache-2.0 (libre, con crédito y patentes)</option>
          <option value="CC0-1.0">CC0-1.0 (dominio público)</option>
        </select>
      </label>
      <label className="flex items-start gap-2 text-sm text-slate-700"><input type="checkbox" className="mt-1" disabled={ocupado} checked={consentimiento} onChange={(event) => setConsentimiento(event.target.checked)} />Autorizo publicarla bajo esta licencia. Revisé que su nombre, descripción y ejemplos no tienen datos privados.</label>
      <button type="button" disabled={ocupado || !consentimiento} onClick={publicar} className={`${BOTON} bg-blue-700 text-white`}>{ocupado ? 'Publicando…' : 'Publicar en la comunidad'}</button>
    </>}
    {error && <p role="alert" className="break-words text-sm text-red-700">{error}</p>}
  </div>;
}
