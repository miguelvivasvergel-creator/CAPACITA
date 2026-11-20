/**
 * Muestra un texto con el formato mínimo que puede escribir la IA (títulos «## », **negrita**,
 * viñetas «- », listas «1. », frases destacadas «> » y tablas «| a | b |»), igual que el correo y
 * Telegram (backend/connectors/formato.py). Solo crea elementos de React: el contenido se muestra
 * siempre como texto, nunca como HTML. Sin marcas, se ve como un párrafo normal.
 */
import { bloques, MARCAS, tieneFormato } from '../../utils/textoFormato';

function EnLinea({ texto }) {
  const partes = [];
  let ultimo = 0;
  for (const m of texto.matchAll(MARCAS)) {
    if (m.index > ultimo) partes.push(texto.slice(ultimo, m.index));
    partes.push(m[1] !== undefined
      ? <strong key={m.index} className="font-semibold text-slate-900">{m[1]}</strong>
      : <em key={m.index}>{m[2]}</em>);
    ultimo = m.index + m[0].length;
  }
  if (ultimo < texto.length) partes.push(texto.slice(ultimo));
  return <>{partes}</>;
}

const Lineas = ({ items }) => items.map((linea, j) => <span key={j}>{j > 0 && <br />}<EnLinea texto={linea} /></span>);

function Bloque({ bloque }) {
  if (bloque.tipo === 'titulo') {
    const Etiqueta = bloque.nivel <= 2 ? 'h4' : 'h5';
    return <Etiqueta className={`${bloque.nivel <= 2 ? 'text-base' : 'text-sm'} pt-1 font-bold text-slate-900`}><EnLinea texto={bloque.texto} /></Etiqueta>;
  }
  if (bloque.tipo === 'parrafo') return <p><Lineas items={bloque.items} /></p>;
  if (bloque.tipo === 'lista') return <ul className="list-disc space-y-1 pl-5">{bloque.items.map((item, j) => <li key={j}><EnLinea texto={item} /></li>)}</ul>;
  if (bloque.tipo === 'numerada') return <ol className="list-decimal space-y-1 pl-5">{bloque.items.map((item, j) => <li key={j}><EnLinea texto={item} /></li>)}</ol>;
  if (bloque.tipo === 'cita') return <blockquote className="rounded-xl border-l-4 border-indigo-400 bg-indigo-50 px-3 py-2 font-medium text-indigo-950"><Lineas items={bloque.items} /></blockquote>;
  if (bloque.tipo === 'tabla') {
    return <div className="max-w-full overflow-x-auto rounded-xl border border-slate-200 bg-white">
      <table className="w-full min-w-max border-collapse text-sm">
        {bloque.encabezado && <thead className="bg-slate-50 text-left text-xs text-slate-600"><tr>{bloque.encabezado.map((celda, j) => <th key={j} scope="col" className="px-3 py-2 font-semibold"><EnLinea texto={celda} /></th>)}</tr></thead>}
        <tbody>{bloque.filas.map((fila, j) => <tr key={j} className="border-t border-slate-100">{fila.map((celda, k) => <td key={k} className="px-3 py-2"><EnLinea texto={celda} /></td>)}</tr>)}</tbody>
      </table>
    </div>;
  }
  return <hr className="border-slate-200" />;
}

export default function TextoConFormato({ texto, className = '' }) {
  if (!tieneFormato(texto)) return <p className={`whitespace-pre-wrap break-words ${className}`}>{texto}</p>;
  return <div className={`min-w-0 space-y-3 break-words leading-relaxed ${className}`}>
    {bloques(texto).map((bloque, n) => <Bloque key={n} bloque={bloque} />)}
  </div>;
}
