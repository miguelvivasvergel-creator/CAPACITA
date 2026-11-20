import { useEffect, useMemo, useRef, useState } from 'react';
import Icono from '../common/Icono';
import { ajustarOpciones } from '../../services/objetivos';
import { consultarRun, ejecutarVersion } from '../../services/versiones';
import { conMuestras, esArchivo, infoTipo, leerArchivo } from '../../utils/archivos';
import ResultadoDatos from '../common/ResultadoDatos';
import { HEX, ajusteDirecto, archivosOpcionales, opcionesEditables, resumenValores, valoresIniciales } from './ajustes';

const BOTON = 'min-h-11 rounded-xl px-4 py-2 text-sm font-semibold disabled:opacity-50';
const activo = (status) => ['queued', 'running'].includes(status);
const pausa = (ms) => new Promise((ok) => setTimeout(ok, ms));
const MUESTRA_DE = (media) => (media.startsWith('image/') ? 'foto' : media === 'application/pdf' ? 'pdf' : media.includes('word') ? 'word' : 'excel');

/**
 * Vista previa «en prueba»: ejecuta la herramienta recién creada con el archivo de la
 * persona, muestra el resultado y deja ajustarla (controles o chat) antes de guardarla.
 */
export default function VistaPrevia({ version, definition, archivo, registrarAjustador, onEstado, onGuardar, onDescartar, onMejorar }) {
  const opciones = useMemo(() => opcionesEditables(definition), [definition]);
  const opcionales = useMemo(() => archivosOpcionales(definition), [definition]);
  // Solo se habla de «tu archivo» si la herramienta recibe uno obligatorio.
  const conArchivo = Object.entries(definition.input_schema?.properties || {})
    .some(([nombre, spec]) => esArchivo(spec) && definition.input_schema?.required?.includes(nombre));
  // archivos: { campo: clave } de los archivos opcionales elegidos (logo, plantilla…); el
  // contenido base64 vive en «subidos» para no copiarlo en cada intento ni compararlo al pintar.
  const iniciales = useMemo(() => ({ ...valoresIniciales(definition, opciones), archivos: {} }), [definition, opciones]);
  const [valores, setValores] = useState(iniciales); // los del último intento pedido
  const [borrador, setBorrador] = useState(iniciales); // lo que se edita en los controles
  const [intentos, setIntentos] = useState([]); // { id, pedido, nota, valores, run, error }
  const [elegido, setElegido] = useState(-1);
  const [trabajando, setTrabajando] = useState(false);
  const [aviso, setAviso] = useState('');
  const [cerrada, setCerrada] = useState(false);
  const [leyendo, setLeyendo] = useState('');
  const subidos = useRef(new Map());
  const archivos = useRef(null), vivo = useRef(true), inicio = useRef(false), final = useRef(null), ajustarRef = useRef(null);

  useEffect(() => { vivo.current = true; return () => { vivo.current = false; }; }, []);
  useEffect(() => { final.current?.scrollIntoView({ behavior: 'smooth', block: 'end' }); }, [intentos, trabajando]);

  // Los archivos de entrada se preparan una sola vez: el de la persona o uno de muestra.
  // Con dos o más archivos obligatorios (comparar versiones) solo hay uno de la persona: se
  // usan muestras distintas (word, word2…) para que el resultado tenga sentido.
  function entradasArchivo() {
    archivos.current ||= (async () => {
      const entradas = {}; let deMuestra = false;
      const requeridos = definition.input_schema?.required || [];
      const campos = Object.entries(definition.input_schema?.properties || {}).filter(([nombre, spec]) => esArchivo(spec) && requeridos.includes(nombre));
      const vistos = {};
      for (const [nombre, spec] of campos) {
        const tipo = MUESTRA_DE(spec.contentMediaType || 'image/jpeg');
        vistos[tipo] = (vistos[tipo] || 0) + 1;
        try {
          if (!archivo || campos.length > 1) throw new Error('sin archivo');
          entradas[nombre] = await leerArchivo(archivo, spec.contentMediaType);
        } catch {
          entradas[nombre] = await conMuestras(`MUESTRA:${tipo}${vistos[tipo] === 2 && tipo === 'word' ? '2' : ''}`);
          deMuestra = true;
        }
      }
      return { entradas, deMuestra, varios: campos.length > 1 };
    })();
    return archivos.current;
  }

  async function ejecutar(nuevos, pedido, nota) {
    const id = crypto.randomUUID();
    setValores(nuevos); setBorrador(nuevos); setTrabajando(true); setAviso('');
    setIntentos((old) => [...old, { id, pedido, nota, valores: nuevos, run: null }]);
    setElegido(-1); onEstado?.('probando');
    const actualizar = (cambios) => vivo.current && setIntentos((old) => old.map((item) => (item.id === id ? { ...item, ...cambios } : item)));
    try {
      const { entradas, deMuestra, varios } = await entradasArchivo();
      if (deMuestra && vivo.current) setAviso(varios
        ? 'Para mostrarte cómo queda usé archivos de muestra. Cuando la guardes y la uses, te pido los tuyos uno por uno.'
        : 'No tenía tu archivo para esta herramienta, así que usé uno de muestra. Sube el tuyo con el clip y pide otra cosa para usarlo.');
      const extra = Object.fromEntries(Object.entries(nuevos.archivos || {}).filter(([, clave]) => subidos.current.has(clave))
        .map(([campo, clave]) => [campo, subidos.current.get(clave).base64]));
      let run = await ejecutarVersion(version.id, { ...nuevos.entrada, ...entradas, ...extra }, nuevos.parametro, id);
      actualizar({ run });
      while (activo(run.status) && vivo.current) {
        await pausa(1500);
        run = await consultarRun(run.id);
        actualizar({ run });
      }
    } catch (cause) {
      actualizar({ error: cause.message });
    } finally {
      if (vivo.current) { setTrabajando(false); onEstado?.('aprobar'); }
    }
  }

  // Primera vista con los valores iniciales (una sola vez, también en StrictMode).
  useEffect(() => {
    if (inicio.current) return;
    inicio.current = true;
    ejecutar(iniciales, null, 'Así queda con los valores iniciales.');
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Lo que la persona escribe en el chat mientras la vista previa está abierta.
  async function ajustar(texto) {
    if (trabajando) { setAviso('Espera a que termine el intento actual y vuelve a escribirlo.'); return 'ocupado'; }
    const parametros = opciones.filter((opcion) => opcion.origen === 'parametro');
    const directo = ajusteDirecto(texto, opciones, valores.parametro);
    if (directo) { ejecutar({ ...valores, parametro: directo.parametros }, texto, directo.explicacion); return 'ajustado'; }
    if (!parametros.length) { onMejorar?.(texto, 'Esta herramienta no tiene opciones para ajustar.'); return 'mejorar'; }
    setTrabajando(true); setAviso('');
    try {
      const respuesta = await ajustarOpciones({ request: texto, tool_name: definition.name, tool_description: definition.description, parameter_schema: definition.parameter_schema, current: valores.parametro });
      if (!vivo.current) return 'cerrada';
      setTrabajando(false);
      if (respuesta.decision === 'adjust') { ejecutar({ ...valores, parametro: respuesta.parameters }, texto, respuesta.explanation); return 'ajustado'; }
      if (respuesta.decision === 'improve') { onMejorar?.(texto, respuesta.explanation); return 'mejorar'; }
      return 'nuevo';
    } catch (cause) {
      if (vivo.current) { setTrabajando(false); setAviso(cause.status === 429 && (cause.retryAfter || 0) <= 15 ? 'Vas muy rápido. Espera unos segundos y vuelve a escribirlo, o usa los controles.' : cause.message); }
      return 'error';
    }
  }
  ajustarRef.current = ajustar;

  useEffect(() => {
    if (cerrada) return undefined;
    const mio = (texto) => ajustarRef.current(texto);
    registrarAjustador?.(mio);
    return () => registrarAjustador?.(null, mio);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cerrada]);

  async function subirOpcional(campo, archivo) {
    if (!archivo) return;
    setLeyendo(campo.nombre); setAviso('');
    try {
      const clave = crypto.randomUUID();
      subidos.current.set(clave, { base64: await leerArchivo(archivo, campo.media), nombre: archivo.name });
      setBorrador((old) => ({ ...old, archivos: { ...old.archivos, [campo.nombre]: clave } }));
    } catch (cause) { setAviso(cause.message); } finally { setLeyendo(''); }
  }
  const quitarOpcional = (campo) => setBorrador((old) => {
    const restantes = { ...old.archivos }; delete restantes[campo.nombre];
    return { ...old, archivos: restantes };
  });
  const resumen = (valores) => [resumenValores(valores, opciones), ...opcionales.filter((campo) => valores.archivos?.[campo.nombre])
    .map((campo) => `${campo.etiqueta}: ${subidos.current.get(valores.archivos[campo.nombre])?.nombre || 'sí'}`)].filter(Boolean).join(' · ');
  const cambiar = (opcion, valor) => setBorrador((old) => ({ ...old, [opcion.origen]: { ...old[opcion.origen], [opcion.nombre]: valor } }));
  const sinCambios = JSON.stringify(borrador) === JSON.stringify(valores);
  const indice = elegido >= 0 ? elegido : intentos.length - 1;
  const actual = intentos[indice];
  const terminados = intentos.filter((item) => item.run?.status === 'completed');

  function volverA(index) {
    setElegido(index); setValores(intentos[index].valores); setBorrador(intentos[index].valores);
  }

  return <div className="mt-3 space-y-3 rounded-xl border border-violet-200 bg-violet-50/50 p-3">
    <p className="text-sm font-semibold text-violet-900"><Icono nombre="matraz" className="mr-1 inline h-3.5 w-3.5 align-[-2px]" />En prueba · solo tú la ves. Ajústala hasta que te guste.</p>
    {aviso && <p role="status" className="rounded-lg bg-amber-50 p-2 text-sm text-amber-900">{aviso}</p>}

    {intentos.length > 1 && <ol className="space-y-1 text-sm">{intentos.map((item, index) => index !== indice && <li key={item.id} className="flex flex-wrap items-center gap-2 text-slate-600">
      <span>Intento {index + 1}{item.pedido ? ` («${item.pedido}»)` : ''} · {resumen(item.valores) || 'sin opciones'}</span>
      {item.run?.status === 'completed' && <button type="button" disabled={trabajando} className="text-violet-700 underline disabled:opacity-50" onClick={() => volverA(index)}>Volver a este</button>}
    </li>)}</ol>}

    {actual && <div className="rounded-xl bg-white p-3">
      <p className="text-xs font-semibold text-slate-500">Intento {indice + 1}{actual.pedido ? ` · pediste «${actual.pedido}»` : ''}</p>
      {actual.nota && <p className="mt-1 text-sm text-slate-700">{actual.nota}</p>}
      {(opciones.length > 0 || opcionales.length > 0) && <p className="mt-1 break-words text-xs text-slate-500">{resumen(actual.valores)}</p>}
      {actual.error && <p role="alert" className="mt-2 break-words text-sm text-red-700">{actual.error}</p>}
      {!actual.error && (!actual.run || activo(actual.run.status)) && <p className="mt-2 text-sm text-slate-600">{actual.run?.status === 'queued' ? 'En cola: esperando al trabajador…' : conArchivo ? 'Aplicándola a tu archivo…' : 'Probándola con estos datos…'}</p>}
      {actual.run?.status === 'completed' && <div className="mt-2 text-sm"><ResultadoDatos value={actual.run.output} nombre={definition.name} /></div>}
      {actual.run && ['failed', 'interrupted'].includes(actual.run.status) && <p role="alert" className="mt-2 break-words text-sm text-red-700">No pudo terminar{actual.run.report?.error ? `: ${actual.run.report.error}` : ''}. Prueba con otros valores o pide que la mejore.</p>}
    </div>}

    {!cerrada && (opciones.length > 0 || opcionales.length > 0) && <form className="space-y-2 rounded-xl bg-white p-3" onSubmit={(event) => { event.preventDefault(); if (!sinCambios && !trabajando) ejecutar(borrador, null, 'Con los valores que elegiste.'); }}>
      <p className="text-xs font-semibold text-slate-500">Opciones</p>
      {opciones.map((opcion) => {
        const valor = borrador[opcion.origen][opcion.nombre];
        const id = `opcion-${version.id}-${opcion.origen}-${opcion.nombre}`;
        const numero = ['number', 'integer'].includes(opcion.tipo);
        const conRango = numero && opcion.min !== undefined && opcion.max !== undefined && opcion.max > opcion.min;
        const paso = opcion.tipo === 'integer' ? 1 : conRango ? (opcion.max - opcion.min) / 100 : 'any';
        return <div key={id} className="text-sm">
          <label htmlFor={id} className="font-medium">{opcion.etiqueta}</label>
          {opcion.descripcion && <p className="text-xs text-slate-500">{opcion.descripcion}</p>}
          <div className="mt-1 flex items-center gap-2">
            {opcion.tipo === 'boolean' && <input id={id} type="checkbox" checked={Boolean(valor)} disabled={trabajando} onChange={(event) => cambiar(opcion, event.target.checked)} />}
            {opcion.tipo === 'string' && opcion.opciones && <select id={id} className="min-h-11 w-full rounded-lg border px-2" value={valor} disabled={trabajando} onChange={(event) => cambiar(opcion, event.target.value)}>{opcion.opciones.map((item) => <option key={item} value={item}>{item}</option>)}</select>}
            {opcion.color && <input aria-label={`${opcion.etiqueta} (selector de color)`} type="color" className="h-11 w-14 shrink-0 cursor-pointer rounded-lg border bg-white p-1" value={HEX.test(valor) ? valor.toLowerCase() : '#000000'} disabled={trabajando} onChange={(event) => cambiar(opcion, event.target.value.toUpperCase())} />}
            {opcion.tipo === 'string' && !opcion.opciones && <input id={id} className="min-h-11 w-full rounded-lg border px-2" value={valor} disabled={trabajando} onChange={(event) => cambiar(opcion, event.target.value)} />}
            {conRango && <input aria-label={`${opcion.etiqueta} (barra)`} type="range" className="w-full accent-violet-600" min={opcion.min} max={opcion.max} step={paso} value={valor} disabled={trabajando} onChange={(event) => cambiar(opcion, Number(event.target.value))} />}
            {numero && <input id={id} type="number" className="min-h-11 w-24 rounded-lg border px-2" min={opcion.min} max={opcion.max} step={paso} value={valor} disabled={trabajando} onChange={(event) => event.target.value !== '' && cambiar(opcion, opcion.tipo === 'integer' ? Math.round(Number(event.target.value)) : Number(event.target.value))} />}
          </div>
        </div>;
      })}
      {opcionales.map((campo) => {
        const elegido = borrador.archivos?.[campo.nombre];
        const id = `archivo-${version.id}-${campo.nombre}`;
        return <div key={campo.nombre} className="text-sm">
          <p className="font-medium">{campo.etiqueta} <span className="text-xs font-normal text-slate-500">(opcional)</span></p>
          {campo.descripcion && <p className="text-xs text-slate-500">{campo.descripcion}</p>}
          <div className="mt-1 flex flex-wrap items-center gap-2">
            <label htmlFor={id} className={`${BOTON} cursor-pointer border border-violet-300 bg-white text-violet-800 ${trabajando || leyendo ? 'pointer-events-none opacity-50' : ''}`}>
              {leyendo === campo.nombre ? 'Leyendo…' : `${elegido ? 'Cambiar' : 'Subir'} ${infoTipo(campo.media).nombre}`}
            </label>
            <input id={id} type="file" className="sr-only" accept={infoTipo(campo.media).acepta} disabled={trabajando || Boolean(leyendo)}
              onChange={(event) => { subirOpcional(campo, event.target.files?.[0]); event.target.value = ''; }} />
            {elegido && <><span className="break-all text-xs text-slate-600">{subidos.current.get(elegido)?.nombre}</span>
              <button type="button" className="text-xs text-slate-600 underline" disabled={trabajando} onClick={() => quitarOpcional(campo)}>Quitar</button></>}
          </div>
        </div>;
      })}
      <button type="submit" disabled={trabajando || sinCambios} className={`${BOTON} bg-violet-600 text-white`}>Ver cómo queda</button>
    </form>}

    {!cerrada && <p className="text-xs text-slate-500">También puedes escribirme abajo, por ejemplo «ponle solo un 30 %», «hazla moderna en verde» o «un poco más suave». Lo que escribas se envía a Gemini; tus archivos no.</p>}
    {!cerrada && <div className="flex flex-wrap gap-2">
      <button type="button" disabled={trabajando || !terminados.length} className={`${BOTON} bg-emerald-600 text-white`} onClick={() => { setCerrada(true); onGuardar?.(actual?.run?.status === 'completed' ? actual.valores : terminados.at(-1)?.valores); }}><Icono nombre="ok" className="mr-1 inline h-4 w-4 align-[-3px]" />Me gusta, guardarla</button>
      <button type="button" disabled={trabajando} className={`${BOTON} border border-slate-300`} onClick={async () => {
        // Si no se pudo desactivar, los botones vuelven para poder reintentarlo.
        setCerrada(true); if (await onDescartar?.() === false && vivo.current) setCerrada(false);
      }}><Icono nombre="basura" className="mr-1 inline h-4 w-4 align-[-3px]" />Descartar</button>
    </div>}
    <div ref={final} />
  </div>;
}
