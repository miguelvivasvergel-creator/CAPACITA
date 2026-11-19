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

export default function ResultadoDatos({ value, nombre = 'resultado' }) {
  if (value === null || value === undefined) return <span className="text-slate-500">Sin valor</span>;
  const media = detectarTipo(value);
  if (media) return <Archivo value={value} media={media} nombre={nombre} />;
  if (typeof value !== 'object') return <p className="whitespace-pre-wrap break-words">{typeof value === 'boolean' ? value ? 'Sí' : 'No' : String(value)}</p>;
  if (Array.isArray(value)) return value.length ? <ol className="list-decimal space-y-2 pl-5">{value.map((item, index) => <li key={index} className="min-w-0"><ResultadoDatos value={item} nombre={`${nombre}-${index + 1}`} /></li>)}</ol> : <p>Sin elementos.</p>;
  return <dl className="min-w-0 space-y-3">{Object.entries(value).map(([key, item]) => <div key={key} className="min-w-0"><dt className="break-words text-sm font-semibold text-slate-700">{etiquetaLegible(key)}</dt><dd className="mt-1 min-w-0"><ResultadoDatos value={item} nombre={key} /></dd></div>)}</dl>;
}
