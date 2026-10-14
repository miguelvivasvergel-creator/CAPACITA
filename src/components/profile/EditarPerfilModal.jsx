// Modal para editar nombre, bio y foto del perfil propio.
import { useState, useEffect } from 'react';
import { guardarPerfil } from '../../services/perfil';

const MAX_BIO = 300;
const MAX_FOTO_BYTES = 2 * 1024 * 1024;

export default function EditarPerfilModal({ perfil, onCerrar, onGuardado }) {
  const [nombre, setNombre] = useState(perfil.display_name);
  const [bio, setBio] = useState(perfil.bio || '');
  const [foto, setFoto] = useState(null);
  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState('');

  // Cerrar con la tecla Escape
  useEffect(() => {
    const alPresionar = (e) => e.key === 'Escape' && onCerrar();
    document.addEventListener('keydown', alPresionar);
    return () => document.removeEventListener('keydown', alPresionar);
  }, [onCerrar]);

  const elegirFoto = (archivo) => {
    setError('');
    if (!archivo) return;
    if (!['image/png', 'image/jpeg'].includes(archivo.type)) {
      setError('La foto debe ser PNG o JPG.');
      return;
    }
    if (archivo.size > MAX_FOTO_BYTES) {
      setError('La foto supera el límite de 2 MB.');
      return;
    }
    setFoto(archivo);
  };

  const guardar = async (e) => {
    e.preventDefault();
    setGuardando(true);
    setError('');
    try {
      const actualizado = await guardarPerfil({ display_name: nombre.trim(), bio: bio.trim(), foto });
      onGuardado(actualizado);
    } catch (err) {
      setError(err.message);
      setGuardando(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm"
      onClick={onCerrar}
    >
      <form
        role="dialog"
        aria-modal="true"
        aria-labelledby="titulo-editar-perfil"
        onClick={(e) => e.stopPropagation()}
        onSubmit={guardar}
        className="w-full max-w-md bg-white rounded-2xl shadow-card border border-slate-100 p-6 sm:p-7"
      >
        <h2 id="titulo-editar-perfil" className="text-lg font-bold text-slate-900">
          Editar perfil
        </h2>

        <label className="block mt-5">
          <span className="text-sm font-semibold text-slate-700">Nombre visible</span>
          <input
            value={nombre}
            onChange={(e) => setNombre(e.target.value)}
            maxLength={60}
            required
            className="mt-1.5 w-full px-3.5 py-2 text-sm bg-white border border-slate-200 rounded-xl text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-[#1a56db] transition"
          />
        </label>

        <label className="block mt-4">
          <span className="flex justify-between text-sm font-semibold text-slate-700">
            Bio
            <span className={`text-xs font-medium ${bio.length > MAX_BIO ? 'text-red-500' : 'text-slate-400'}`}>
              {bio.length}/{MAX_BIO}
            </span>
          </span>
          <textarea
            value={bio}
            onChange={(e) => setBio(e.target.value)}
            maxLength={MAX_BIO}
            rows={3}
            placeholder="Cuéntale a la comunidad qué haces..."
            className="mt-1.5 w-full px-3.5 py-2 text-sm bg-white border border-slate-200 rounded-xl text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-[#1a56db] transition resize-none"
          />
        </label>

        <label className="mt-4 flex items-center justify-between gap-3 p-3 rounded-xl bg-slate-50 border border-slate-200/80 cursor-pointer">
          <span className="text-sm text-slate-600 truncate">
            {foto ? foto.name : 'Cambiar foto (PNG o JPG, máx. 2 MB)'}
          </span>
          <span className="text-xs font-semibold text-[#1a56db] shrink-0">Elegir</span>
          <input
            type="file"
            accept="image/png,image/jpeg"
            className="sr-only"
            onChange={(e) => elegirFoto(e.target.files[0])}
          />
        </label>

        {error && (
          <p className="mt-4 text-sm text-red-600 bg-red-50 border border-red-100 rounded-lg px-3 py-2">{error}</p>
        )}

        <div className="mt-6 flex justify-end gap-2.5">
          <button
            type="button"
            onClick={onCerrar}
            className="px-4 py-2 rounded-lg text-sm font-semibold text-slate-700 bg-white border border-slate-200 hover:bg-slate-50 transition-colors cursor-pointer"
          >
            Cancelar
          </button>
          <button
            type="submit"
            disabled={guardando || !nombre.trim()}
            className="px-4 py-2 rounded-lg text-sm font-semibold text-white bg-[#1a56db] hover:bg-blue-700 active:scale-[0.98] transition-all shadow-xs cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
          >
            {guardando ? 'Guardando...' : 'Guardar cambios'}
          </button>
        </div>
      </form>
    </div>
  );
}
