import { useState } from 'react';
import { formatearMesAnio } from '../../utils/formato';

export default function PerfilEncabezado({ perfil, esPropio, onEditar, onConfigurar }) {
  const [imgError, setImgError] = useState(false);

  const avatarUrl =
    perfil.avatar_url ||
    `https://ui-avatars.com/api/?name=${encodeURIComponent(perfil.display_name)}&background=1a56db&color=fff&size=256&bold=true`;

  return (
    <section className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden">
      {/* Franja de color superior */}
      <div className="h-28 sm:h-32 bg-gradient-to-r from-blue-100 via-indigo-50 to-cyan-100" />

      <div className="px-5 sm:px-8 pb-6">
        <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4 -mt-12">
          {/* Avatar */}
          {!imgError ? (
            <img
              src={avatarUrl}
              alt={perfil.display_name}
              onError={() => setImgError(true)}
              className="w-24 h-24 rounded-2xl object-cover border-4 border-white shadow-md bg-white"
            />
          ) : (
            <div className="w-24 h-24 rounded-2xl bg-[#1a56db] text-white text-3xl font-bold flex items-center justify-center border-4 border-white shadow-md">
              {perfil.display_name[0]?.toUpperCase()}
            </div>
          )}

          {/* Acciones: solo en el perfil propio */}
          {esPropio && (
            <div className="flex items-center gap-2">
              <button
                onClick={onEditar}
                className="flex items-center gap-1.5 bg-[#1a56db] hover:bg-blue-700 active:scale-[0.98] text-white text-[13px] font-semibold px-3.5 py-2 rounded-lg transition-all shadow-xs cursor-pointer"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536M9 13l6.232-6.232a2.5 2.5 0 113.536 3.536L12.536 16.536 8 17l.464-4.536z" />
                </svg>
                Editar perfil
              </button>
              <button
                onClick={onConfigurar}
                className="flex items-center gap-1.5 bg-white hover:bg-slate-50 text-slate-700 text-[13px] font-semibold px-3.5 py-2 rounded-lg border border-slate-200 transition-colors cursor-pointer"
              >
                <svg className="w-4 h-4 text-slate-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
                Configurar
              </button>
            </div>
          )}
        </div>

        {/* Nombre, usuario y bio (siempre como texto, nunca como HTML) */}
        <div className="mt-4">
          <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
            {perfil.display_name}
          </h1>
          <p className="text-sm font-medium text-slate-500">@{perfil.username}</p>
          {perfil.bio && (
            <p className="mt-3 text-sm sm:text-[15px] text-slate-600 max-w-2xl leading-relaxed">
              {perfil.bio}
            </p>
          )}
          {perfil.created_at && (
            <p className="mt-3 inline-flex items-center gap-1.5 text-xs text-slate-400">
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
              Miembro desde {formatearMesAnio(perfil.created_at)}
            </p>
          )}
        </div>
      </div>
    </section>
  );
}
