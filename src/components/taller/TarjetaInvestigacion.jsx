import { useState } from 'react';
import Icono from '../common/Icono';
import TextoConFormato from '../common/TextoConFormato';
import { limpiarMensaje } from '../../utils/textoFormato';
/**
 * Lo que la IA investigó en Google antes de diseñar una herramienta.
 *
 * Los términos de Google piden mostrar el resultado junto a sus «Search Suggestions» sin
 * modificarlas. Ese HTML viene de Google, no de la persona: se aísla en un iframe sin scripts
 * ni acceso a la página (sandbox) y sus enlaces se abren en otra pestaña. El resumen y las
 * fuentes se muestran como texto (títulos, listas y negrita con elementos de React, nunca HTML).
 * Un resumen largo se muestra recortado con «Ver todo». Nada de esto se guarda.
 */
const LARGO = 520;

const dominio = (fuente) => {
  try { return new URL(fuente.uri).hostname.replace(/^www\./, ''); } catch { return fuente.title; }
};

export default function TarjetaInvestigacion({ investigacion, clase }) {
  const { summary, sources = [], suggestions_html: sugerencias } = investigacion;
  const [abierta, setAbierta] = useState(false);
  const texto = limpiarMensaje(summary);
  const largo = texto.length > LARGO;
  return <div className={clase}>
    <p className="flex items-center gap-2 font-semibold">
      <span className="taller-icono-redondo" aria-hidden="true"><Icono nombre="buscar" className="h-4 w-4" /></span>
      Investigué cómo se hace bien
    </p>
    <p className="mt-1 text-xs text-slate-500">Lo uso para hacerlo bien. Busqué en Google solo con lo que escribiste; tus archivos no se enviaron.</p>
    <div className={`taller-investigacion mt-3 text-sm text-slate-800 ${largo && !abierta ? 'is-recortada' : ''}`}>
      <TextoConFormato texto={texto} />
    </div>
    {largo && <button type="button" className="mt-1 text-sm font-semibold text-blue-700 hover:underline" aria-expanded={abierta}
      onClick={() => setAbierta(!abierta)}>{abierta ? 'Ver menos' : 'Ver todo lo que investigué'}</button>}
    {sources.length > 0 && <div className="mt-3 border-t border-slate-100 pt-3">
      <p className="text-xs font-semibold text-slate-500">Fuentes ({sources.length})</p>
      <ul className="mt-2 flex flex-wrap gap-1.5">{sources.map((fuente) => <li key={fuente.uri}>
        <a href={fuente.uri} target="_blank" rel="noopener noreferrer" title={fuente.title}
          className="inline-flex max-w-[14rem] items-center gap-1 rounded-full border border-slate-200 bg-slate-50 px-2.5 py-1 text-xs text-slate-700 hover:border-blue-300 hover:text-blue-800">
          <Icono nombre="globo" className="h-3 w-3 shrink-0" /><span className="truncate">{fuente.title || dominio(fuente)}</span>
        </a>
      </li>)}</ul>
    </div>}
    {sugerencias && <iframe title="Sugerencias de búsqueda de Google" sandbox="allow-popups allow-popups-to-escape-sandbox"
      srcDoc={`<!doctype html><meta charset="utf-8"><base target="_blank">${sugerencias}`}
      className="mt-3 h-16 w-full rounded-lg border-0" />}
  </div>;
}
