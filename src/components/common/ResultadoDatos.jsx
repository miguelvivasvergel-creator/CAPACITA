import { descargar, detectarTipo, infoTipo, tamano, urlDatos } from '../../utils/archivos';
import { etiquetaLegible } from '../../utils/etiquetas';

// Un archivo (base64) se muestra como vista previa o ficha con botón de descarga.
function Archivo({ value, media, nombre }) {
  const tipo = infoTipo(media);
  return <div className="space-y-2">
    {media.startsWith('image/') && <img src={urlDatos(value, media)} alt={`Resultado: ${nombre}`} className="max-h-80 w-auto max-w-full rounded-xl border border-slate-200 bg-white object-contain" />}
    <div className="flex flex-wrap items-center gap-2">
      <span className="text-sm text-slate-700">{tipo.icono} {tipo.nombre} · {tamano(value)}</span>
      <button type="button" onClick={() => descargar(value, media, nombre)} className="min-h-11 rounded-xl bg-blue-700 px-4 py-2 text-sm font-semibold text-white">📥 Descargar</button>
    </div>
  </div>;
}

const FECHA = /^\d{4}-\d{2}-\d{2}$/;
const escalar = (valor) => valor === null || ['string', 'number', 'boolean'].includes(typeof valor);
// «2026-11-21» → «sáb 21 nov» (fecha local, sin corrimiento por zona horaria).
function fechaLegible(texto) {
  const [anio, mes, dia] = texto.split('-').map(Number);
  const fecha = new Date(anio, mes - 1, dia);
  return Number.isNaN(fecha.getTime()) ? texto : fecha.toLocaleDateString('es-CO', { weekday: 'short', day: 'numeric', month: 'short' });
}
const celda = (valor) => (typeof valor === 'boolean' ? (valor ? 'Sí' : 'No') : valor === null ? '—'
  : typeof valor === 'string' && FECHA.test(valor) ? fechaLegible(valor) : String(valor));

// Lista de filas planas (días, festivos, productos…): mejor como tabla que como bloques.
function esTabla(lista) {
  if (lista.length < 2 || !lista.every((fila) => fila && typeof fila === 'object' && !Array.isArray(fila))) return false;
  const columnas = new Set(lista.flatMap(Object.keys));
  return columnas.size <= 8 && lista.every((fila) => Object.values(fila).every((valor) => escalar(valor) && !(typeof valor === 'string' && valor.length > 120)));
}

function Tabla({ filas }) {
  // Fecha o nombre primero (la base de datos reordena las claves).
  const columnas = [...new Set(filas.flatMap(Object.keys))].sort((a, b) => Number(/fecha|nombre/.test(b)) - Number(/fecha|nombre/.test(a)));
  return <div className="max-w-full overflow-x-auto rounded-xl border border-slate-200 bg-white">
    <table className="w-full min-w-max border-collapse text-sm">
      <thead className="bg-slate-50 text-left text-xs text-slate-600"><tr>{columnas.map((col) => <th key={col} scope="col" className="px-3 py-2 font-semibold">{etiquetaLegible(col)}</th>)}</tr></thead>
      <tbody>{filas.map((fila, index) => <tr key={index} className="border-t border-slate-100">{columnas.map((col) => <td key={col} className={`px-3 py-2 ${typeof fila[col] === 'number' ? 'text-right tabular-nums' : ''}`}>{celda(fila[col])}</td>)}</tr>)}</tbody>
    </table>
  </div>;
}

// Primero el resumen y los datos sueltos; después archivos, listas y objetos. La base de datos
// reordena las claves (jsonb), así que el orden lo decide la pantalla.
function peso([clave, valor]) {
  if (/^(resumen|summary|conclusion)/i.test(clave)) return 0;
  if (detectarTipo(valor)) return 2;
  if (escalar(valor)) return 1;
  return 3;
}

export default function ResultadoDatos({ value, nombre = 'resultado' }) {
  if (value === null || value === undefined) return <span className="text-slate-500">Sin valor</span>;
  const media = detectarTipo(value);
  if (media) return <Archivo value={value} media={media} nombre={nombre} />;
  if (typeof value !== 'object') return <p className="whitespace-pre-wrap break-words">{typeof value === 'boolean' ? value ? 'Sí' : 'No' : String(value)}</p>;
  if (Array.isArray(value)) {
    if (!value.length) return <p>Sin elementos.</p>;
    if (esTabla(value)) return <Tabla filas={value} />;
    return <ol className="list-decimal space-y-2 pl-5">{value.map((item, index) => <li key={index} className="min-w-0"><ResultadoDatos value={item} nombre={`${nombre}-${index + 1}`} /></li>)}</ol>;
  }
  const entradas = Object.entries(value).map((entrada, orden) => [entrada, orden]).sort(([a, i], [b, j]) => peso(a) - peso(b) || i - j).map(([entrada]) => entrada);
  return <dl className="min-w-0 space-y-3">{entradas.map(([key, item]) => <div key={key} className="min-w-0"><dt className="break-words text-sm font-semibold text-slate-700">{etiquetaLegible(key)}</dt><dd className="mt-1 min-w-0"><ResultadoDatos value={item} nombre={key} /></dd></div>)}</dl>;
}
