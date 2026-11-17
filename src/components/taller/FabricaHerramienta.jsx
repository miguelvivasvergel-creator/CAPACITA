import { useEffect, useRef, useState } from 'react';
import { api } from '../../api';
import { comprobarDefinicion, guardarDefinicion } from '../../services/definiciones';
import { generarCandidato, repararCandidato, revisarGeneracion } from '../../services/candidatos';
import { crearPrueba } from '../../services/laboratorio';
import { habilitarVersion } from '../../services/versiones';
import { observacionPruebas, pruebaReparable, casosDesdeEjemplos } from './fabrica';

const MAX_CORRECCIONES = 2;
const BOTON = 'min-h-11 rounded-xl px-4 py-2 text-sm font-semibold disabled:opacity-50';

function espera(ms, signal) {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(resolve, ms);
    signal.addEventListener('abort', () => { clearTimeout(timer); reject(new DOMException('Cancelado', 'AbortError')); }, { once: true });
  });
}

/**
 * Fábrica automática: guarda la idea, la IA escribe el código, el entorno aislado lo
 * prueba con los ejemplos de la definición y, si falla, la IA lo corrige (máximo 2 veces).
 * Solo se activa cuando la persona lo confirma; nada se publica.
 */
export default function FabricaHerramienta({ definition, onEstado, onLista }) {
  const [similares, setSimilares] = useState([]);
  const [fase, setFase] = useState('inicio'); // inicio | trabajando | lista | fallo | activa
  const [bitacora, setBitacora] = useState([]);
  const [error, setError] = useState('');
  const [resultado, setResultado] = useState(null); // { candidato, build }
  const capacidad = useRef(null), control = useRef(null), avisar = useRef(onEstado), final = useRef(null);
  useEffect(() => { avisar.current = onEstado; }, [onEstado]);
  // La tarjeta crece con cada paso: mantener visible lo último que ocurrió.
  useEffect(() => { if (bitacora.length) final.current?.scrollIntoView({ behavior: 'smooth', block: 'end' }); }, [bitacora.length, fase, error]);
  const bloqueada = definition.resources?.length > 0 || definition.required_permissions?.length > 0;

  useEffect(() => {
    let vivo = true;
    comprobarDefinicion(definition).then((value) => { if (vivo) setSimilares(value.matches?.items || []); }).catch(() => {});
    return () => { vivo = false; control.current?.abort(); };
  }, [definition]);

  const anotar = (icono, texto, tono = 'activo') => setBitacora((old) => [...old.map((item) => item.tono === 'activo' ? { ...item, tono: 'ok' } : item), { icono, texto, tono }]);
  const estado = (valor) => avisar.current?.(valor);

  // Gemini comparte un turno de 30 s entre generar y corregir: espera y reintenta dos veces.
  async function conTurno(trabajo, signal) {
    for (let intento = 0; ; intento++) {
      try { return await trabajo(); } catch (cause) {
        if (cause.status !== 429 || intento >= 2) throw cause;
        anotar('⏳', 'Esperando turno con la IA (unos 30 segundos)…');
        await espera(31000, signal);
      }
    }
  }

  async function probar(candidato, signal) {
    const ejemplos = candidato.manifest.definition.examples;
    anotar('🧪', `Probándola en el entorno aislado con ${ejemplos.length} ejemplo${ejemplos.length === 1 ? '' : 's'}…`);
    estado('probando');
    let build = await crearPrueba(candidato, casosDesdeEjemplos(ejemplos), crypto.randomUUID());
    for (let lecturas = 1; ['queued', 'testing'].includes(build.status); lecturas++) {
      await espera(2500, signal);
      build = await api(`/builds/${encodeURIComponent(build.id)}`, { signal });
      if (build.status === 'queued' && lecturas === 12) anotar('⏳', 'El trabajador de pruebas aún no responde. Sigo esperando; revisa que esté encendido.');
    }
    return build;
  }

  async function fabricar() {
    const controller = new AbortController(); control.current?.abort(); control.current = controller;
    const { signal } = controller;
    setFase('trabajando'); setError(''); setResultado(null); setBitacora([]);
    try {
      if (!capacidad.current) {
        anotar('💾', 'Guardando la idea en tus herramientas privadas…');
        capacidad.current = await guardarDefinicion(definition, true);
      }
      const revision = await revisarGeneracion(capacidad.current.id, { signal });
      anotar('✍️', 'La IA está escribiendo el código…'); estado('escribiendo');
      const generar = () => conTurno(() => generarCandidato(capacidad.current.id, { definition_hash: revision.definition_hash, acknowledge_similar: true, consent_to_provider: true }), signal);
      let candidato;
      try { candidato = await generar(); } catch (cause) {
        // 422/502: la IA entregó código inválido o bloqueado; se pide otra versión una sola vez.
        if (![422, 502].includes(cause.status)) throw cause;
        anotar('🔁', 'La IA entregó un código que no sirve. Le pido otra versión…');
        candidato = await generar();
      }
      for (let correcciones = 0; ; correcciones++) {
        const build = await probar(candidato, signal);
        const casos = build.report?.cases || [];
        if (build.status === 'passed') {
          anotar('✅', `Superó ${casos.length} de ${casos.length} ejemplos.`, 'ok');
          setResultado({ candidato, build }); setFase('lista'); estado('aprobar');
          return;
        }
        const fallidos = casos.filter((caso) => !caso.passed).length;
        if (!pruebaReparable(build) || correcciones >= MAX_CORRECCIONES) {
          anotar('⚠️', pruebaReparable(build)
            ? `Después de ${MAX_CORRECCIONES} correcciones todavía falla ${fallidos} ejemplo${fallidos === 1 ? '' : 's'}.`
            : 'El entorno de pruebas no pudo completar la comprobación.', 'error');
          setFase('fallo'); estado('failed');
          return;
        }
        anotar('🔧', `Falló ${fallidos} ejemplo${fallidos === 1 ? '' : 's'}. La IA lo está corrigiendo (intento ${correcciones + 1} de ${MAX_CORRECCIONES})…`); estado('corrigiendo');
        const anterior = candidato;
        candidato = await conTurno(() => repararCandidato(anterior.id, { feedback: observacionPruebas(anterior.manifest.definition, build), consent_to_provider: true }), signal);
      }
    } catch (cause) {
      if (signal.aborted) return;
      setError(cause.message); setFase('fallo'); estado('failed');
    }
  }

  async function activar() {
    setError('');
    try {
      const version = await habilitarVersion(resultado.candidato.id, resultado.build.id);
      setFase('activa'); estado('completed'); onLista?.(version);
    } catch (cause) { setError(cause.message); }
  }

  const ejemplos = definition.examples || [];
  return <div className="w-full rounded-2xl border border-amber-200 bg-white p-4 shadow-sm">
    <p className="text-xs font-semibold uppercase tracking-wide text-amber-700">🛠️ Herramienta nueva</p>
    <h3 className="mt-1 break-words text-lg font-bold">{definition.name}</h3>
    <p className="mt-1 break-words text-sm text-slate-600">{definition.description}</p>
    {ejemplos.length > 0 && <div className="mt-3 rounded-xl bg-slate-50 p-3 text-sm">
      <p className="text-xs font-semibold text-slate-500">Así sabré que funciona</p>
      <ul className="mt-1 space-y-1">{ejemplos.slice(0, 3).map((ejemplo, index) => <li key={index} className="break-words font-mono text-xs text-slate-700">{JSON.stringify(ejemplo.inputs)} → {JSON.stringify(ejemplo.expected_output)}</li>)}</ul>
    </div>}
    {bloqueada && <p className="mt-3 rounded-xl bg-amber-50 p-3 text-sm text-amber-900">Esta herramienta necesitaría permisos o recursos externos que el entorno aislado todavía no ofrece. No la crearé.</p>}
    {!bloqueada && fase === 'inicio' && <>
      {similares.length > 0 && <p className="mt-3 break-words text-sm text-slate-600">Se parece a: {similares.slice(0, 3).map((item) => item.name).join(', ')}. Si ninguna te sirve, créala igual.</p>}
      <p className="mt-3 text-xs text-slate-500">Al crearla enviaré a Google Gemini esta descripción y sus ejemplos y, si hay que corregir, el código y qué falló. Nunca tus datos reales. El nivel gratuito puede usar el contenido para mejorar sus productos.</p>
      <button type="button" className={`${BOTON} mt-3 bg-amber-500 text-white`} onClick={fabricar}>Crear y probar</button>
    </>}
    {bitacora.length > 0 && <ol className="mt-3 space-y-1.5" aria-live="polite">{bitacora.map((item, index) => <li key={index} className={`flex gap-2 text-sm ${item.tono === 'error' ? 'text-red-700' : item.tono === 'activo' ? 'font-semibold text-slate-900' : 'text-slate-600'}`}>
      <span aria-hidden="true">{item.icono}</span><span className="break-words">{item.texto}</span>
    </li>)}</ol>}
    {error && <p role="alert" className="mt-3 break-words rounded-xl bg-red-50 p-3 text-sm text-red-800">{error}</p>}
    {fase === 'lista' && <div className="mt-3 rounded-xl bg-emerald-50 p-3">
      {resultado.build.storage_backend === 'supabase' ? <>
        <p className="text-sm text-emerald-900">Está lista y probada. ¿La activo? Solo tú podrás usarla; luego puedes compartirla.</p>
        <button type="button" className={`${BOTON} mt-2 bg-emerald-600 text-white`} onClick={activar}>Activar y continuar</button>
      </> : <p className="text-sm text-emerald-900">Se probó en el laboratorio local; para activarla hace falta el trabajador compartido.</p>}
    </div>}
    {fase === 'fallo' && !bloqueada && <div className="mt-3 flex flex-wrap gap-2">
      <button type="button" className={`${BOTON} bg-amber-500 text-white`} onClick={fabricar}>Intentar de nuevo</button>
      <p className="basis-full text-xs text-slate-500">También puedes describir tu necesidad de otra forma en el chat.</p>
    </div>}
    {fase === 'activa' && <p className="mt-3 text-sm font-semibold text-emerald-700">✅ Activada.</p>}
    <div ref={final} />
  </div>;
}
