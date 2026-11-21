import { useState } from 'react';
import Icono from '../common/Icono';

const BOTON = 'inline-flex min-h-11 items-center gap-1.5 rounded-xl px-3 py-2 text-sm font-semibold disabled:opacity-50';

/**
 * Editar y eliminar algo de Mi biblioteca (herramienta simple o combinada).
 * - onRenombrar(nombre, descripcion): si existe, ofrece «Renombrar» con un formulario corto.
 * - onCambiar(): abre el chat para pedir un cambio en cómo funciona.
 * - onEliminar(): borra tras confirmar con el texto `confirmar`.
 * Lo que escribe la persona se muestra siempre como texto.
 */
export default function AccionesBiblioteca({ nombre, descripcion = '', onRenombrar, onCambiar, onEliminar, confirmar }) {
  const [editando, setEditando] = useState(false);
  const [valores, setValores] = useState({ nombre, descripcion });
  const [ocupado, setOcupado] = useState(false);
  const [error, setError] = useState('');

  async function hacer(tarea) {
    setOcupado(true); setError('');
    try { await tarea(); return true; } catch (causa) { setError(causa.message || 'No se pudo completar.'); return false; } finally { setOcupado(false); }
  }
  async function guardar(event) {
    event.preventDefault();
    const nuevoNombre = valores.nombre.trim(), nuevaDescripcion = valores.descripcion.trim();
    if (nuevoNombre.length < 3) { setError('El nombre necesita al menos 3 letras.'); return; }
    if (nuevaDescripcion.length < 5) { setError('Describe en una frase qué hace (al menos 5 letras).'); return; }
    if (await hacer(() => onRenombrar(nuevoNombre, nuevaDescripcion))) setEditando(false);
  }
  async function eliminar() {
    if (!window.confirm(confirmar)) return;
    await hacer(onEliminar);
  }

  if (editando) {
    return <form onSubmit={guardar} className="biblioteca-editar" aria-label={`Renombrar «${nombre}»`}>
      <label><span>Nombre</span><input value={valores.nombre} maxLength={80} onChange={(event) => setValores((old) => ({ ...old, nombre: event.target.value }))} autoFocus /></label>
      <label><span>Qué hace</span><textarea value={valores.descripcion} maxLength={500} rows={2} onChange={(event) => setValores((old) => ({ ...old, descripcion: event.target.value }))} /></label>
      {error && <p role="alert" className="text-sm text-red-700">{error}</p>}
      <div className="flex flex-wrap gap-2">
        <button type="submit" disabled={ocupado} className={`${BOTON} bg-blue-600 text-white`}><Icono nombre="guardar" className="h-4 w-4" />{ocupado ? 'Guardando…' : 'Guardar'}</button>
        <button type="button" disabled={ocupado} className={`${BOTON} border border-slate-300 text-slate-700`} onClick={() => { setEditando(false); setError(''); setValores({ nombre, descripcion }); }}>Cancelar</button>
      </div>
    </form>;
  }
  return <div className="biblioteca-acciones">
    {onRenombrar && <button type="button" disabled={ocupado} className={`${BOTON} text-slate-700`} onClick={() => setEditando(true)}><Icono nombre="ajustes" className="h-4 w-4" />Renombrar</button>}
    {onCambiar && <button type="button" disabled={ocupado} className={`${BOTON} text-slate-700`} onClick={onCambiar}><Icono nombre="chispa" className="h-4 w-4" />Cambiar cómo funciona</button>}
    <button type="button" disabled={ocupado} className={`${BOTON} text-red-700`} onClick={eliminar}><Icono nombre="basura" className="h-4 w-4" />{ocupado ? 'Eliminando…' : 'Eliminar'}</button>
    {error && <p role="alert" className="w-full text-sm text-red-700">{error}</p>}
  </div>;
}
