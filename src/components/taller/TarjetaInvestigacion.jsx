import Icono from '../common/Icono';
/**
 * Lo que la IA investigó en Google antes de diseñar una herramienta.
 *
 * Los términos de Google piden mostrar el resultado junto a sus «Search Suggestions» sin
 * modificarlas. Ese HTML viene de Google, no de la persona: se aísla en un iframe sin scripts
 * ni acceso a la página (sandbox) y sus enlaces se abren en otra pestaña. El resumen y las
 * fuentes se muestran como texto. Nada de esto se guarda.
 */
export default function TarjetaInvestigacion({ investigacion, clase }) {
  const { summary, sources = [], suggestions_html: sugerencias } = investigacion;
  return <div className={clase}>
    <p className="font-semibold"><Icono nombre="buscar" className="mr-1 inline h-4 w-4 align-[-3px]" />Investigué cómo se hace bien</p>
    <p className="mt-1 text-xs text-slate-500">Lo investigué antes de empezar y lo uso para hacerlo bien. Búsqueda en Google con lo que escribiste; tus archivos no se enviaron.</p>
    {/* Las **negritas** del texto se muestran como negrita, siempre como texto (nunca HTML). */}
    <p className="mt-2 whitespace-pre-wrap break-words text-sm text-slate-800">{summary.split('**').map((trozo, index) => index % 2 ? <strong key={index}>{trozo}</strong> : trozo)}</p>
    {sources.length > 0 && <div className="mt-3">
      <p className="text-xs font-semibold text-slate-500">Fuentes</p>
      <ul className="mt-1 flex flex-wrap gap-2">{sources.map((fuente) => <li key={fuente.uri}>
        <a href={fuente.uri} target="_blank" rel="noopener noreferrer" className="inline-block max-w-[16rem] truncate rounded-full bg-slate-100 px-3 py-1 text-xs text-blue-800 underline hover:bg-slate-200">{fuente.title}</a>
      </li>)}</ul>
    </div>}
    {sugerencias && <iframe title="Sugerencias de búsqueda de Google" sandbox="allow-popups allow-popups-to-escape-sandbox"
      srcDoc={`<!doctype html><meta charset="utf-8"><base target="_blank">${sugerencias}`}
      className="mt-3 h-16 w-full rounded-lg border-0" />}
  </div>;
}
