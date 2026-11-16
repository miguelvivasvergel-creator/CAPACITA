export default function ResultadoDatos({ value }) {
  if (value === null || value === undefined) return <span className="text-slate-500">Sin valor</span>;
  if (typeof value !== 'object') return <p className="whitespace-pre-wrap break-words">{typeof value === 'boolean' ? value ? 'Sí' : 'No' : String(value)}</p>;
  if (Array.isArray(value)) return value.length ? <ol className="list-decimal space-y-2 pl-5">{value.map((item, index) => <li key={index} className="min-w-0"><ResultadoDatos value={item} /></li>)}</ol> : <p>Sin elementos.</p>;
  return <dl className="min-w-0 space-y-3">{Object.entries(value).map(([key, item]) => <div key={key} className="min-w-0"><dt className="break-words text-sm font-semibold text-slate-700">{key.replaceAll('_', ' ')}</dt><dd className="mt-1 min-w-0"><ResultadoDatos value={item} /></dd></div>)}</dl>;
}
