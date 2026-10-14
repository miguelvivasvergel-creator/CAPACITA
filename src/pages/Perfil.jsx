// src/pages/Perfil.jsx
// Perfil propio y público (#perfil/:username). Módulo D — Fahida.
import { useState } from 'react';
import PerfilEncabezado from '../components/profile/PerfilEncabezado';
import PerfilTarjetas from '../components/profile/PerfilTarjetas';
import PerfilActividad from '../components/profile/PerfilActividad';
import { ListaCapacidades, ListaWorkflows, EstadoVacio } from '../components/profile/PerfilListas';
import { obtenerPerfilMock } from '../mocks/profile';

const PESTANAS = [
  { id: 'capacidades', label: 'Capacidades' },
  { id: 'workflows', label: 'Workflows' },
  { id: 'actividad', label: 'Actividad' },
];

export default function Perfil({ usuario, username, onCambiarSeccion, onConfigurar }) {
  const [pestana, setPestana] = useState('capacidades');

  const perfil = obtenerPerfilMock(username, usuario);
  const esPropio = username === usuario?.username;

  if (!perfil) {
    return (
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <EstadoVacio
          icono="🔍"
          titulo="Perfil no encontrado"
          texto={`No existe ningún usuario con el nombre @${username}.`}
        />
      </div>
    );
  }

  const contadores = {
    capacidades: perfil.capabilities.length,
    workflows: perfil.workflows.length,
    actividad: perfil.activity.length,
  };

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-10 space-y-6">
      <PerfilEncabezado
        perfil={perfil}
        esPropio={esPropio}
        onEditar={() => {}}
        onConfigurar={onConfigurar}
      />

      <PerfilTarjetas stats={perfil.stats} />

      {/* Pestañas */}
      <div className="inline-flex items-center bg-slate-100/90 p-1 rounded-xl border border-slate-200/60">
        {PESTANAS.map(({ id, label }) => (
          <button
            key={id}
            onClick={() => setPestana(id)}
            className={`flex items-center gap-2 px-4 py-1.5 rounded-lg text-xs sm:text-sm font-medium transition-all cursor-pointer ${
              pestana === id
                ? 'bg-white text-blue-600 shadow-xs font-semibold'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            {label}
            <span
              className={`text-[11px] px-1.5 rounded-md ${
                pestana === id ? 'bg-blue-50 text-blue-600' : 'bg-slate-200/70 text-slate-500'
              }`}
            >
              {contadores[id]}
            </span>
          </button>
        ))}
      </div>

      {pestana === 'capacidades' && <ListaCapacidades capacidades={perfil.capabilities} />}
      {pestana === 'workflows' && <ListaWorkflows workflows={perfil.workflows} />}
      {pestana === 'actividad' && (
        <PerfilActividad
          actividad={perfil.activity}
          onVerWorkflow={() => onCambiarSeccion?.('workflows')}
        />
      )}
    </div>
  );
}
