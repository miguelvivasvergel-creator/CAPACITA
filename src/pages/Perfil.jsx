// src/pages/Perfil.jsx
// Perfil propio y público (#perfil/:username). Módulo D — Fahida.
import { useState, useEffect } from 'react';
import PerfilEncabezado from '../components/profile/PerfilEncabezado';
import PerfilTarjetas from '../components/profile/PerfilTarjetas';
import PerfilActividad from '../components/profile/PerfilActividad';
import EditarPerfilModal from '../components/profile/EditarPerfilModal';
import { ListaCapacidades, ListaWorkflows, EstadoVacio } from '../components/profile/PerfilListas';
import { cargarPerfil } from '../services/perfil';

const PESTANAS = [
  { id: 'capacidades', label: 'Capacidades' },
  { id: 'workflows', label: 'Workflows' },
  { id: 'actividad', label: 'Actividad' },
];

function PerfilCargando() {
  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-10 space-y-6 animate-pulse">
      <div className="h-64 rounded-2xl bg-slate-100" />
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[1, 2, 3, 4].map((n) => <div key={n} className="h-20 rounded-2xl bg-slate-100" />)}
      </div>
      <div className="h-40 rounded-2xl bg-slate-100" />
    </div>
  );
}

export default function Perfil({ usuario, username, onCambiarSeccion, onConfigurar }) {
  const [datos, setDatos] = useState(undefined); // undefined = cargando, null = no existe
  const [pestana, setPestana] = useState('capacidades');
  const [editando, setEditando] = useState(false);

  useEffect(() => {
    let activo = true;
    cargarPerfil(username, usuario).then((resultado) => {
      if (activo) setDatos(resultado);
    });
    return () => {
      activo = false;
    };
  }, [username, usuario]);

  if (datos === undefined) return <PerfilCargando />;

  if (datos === null) {
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

  const { perfil, deEjemplo } = datos;
  const esPropio = username === usuario?.username;

  const contadores = {
    capacidades: perfil.capabilities.length,
    workflows: perfil.workflows.length,
    actividad: perfil.activity.length,
  };

  const alGuardar = (actualizado) => {
    setDatos({ ...datos, perfil: { ...perfil, ...actualizado } });
    setEditando(false);
  };

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-10 space-y-6">
      {deEjemplo && (
        <p className="text-xs text-amber-800 bg-amber-50 border border-amber-100 rounded-lg px-3 py-2">
          Algunos datos son de ejemplo mientras se conectan todos los módulos.
        </p>
      )}

      <PerfilEncabezado
        perfil={perfil}
        esPropio={esPropio}
        onEditar={() => setEditando(true)}
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
      {pestana === 'workflows' && (
        <ListaWorkflows
          workflows={perfil.workflows}
          onEjecutar={(id) => onCambiarSeccion?.(`ejecutar/workflow/${id}`)}
        />
      )}
      {pestana === 'actividad' && (
        <PerfilActividad
          actividad={perfil.activity}
          onVerWorkflow={() => onCambiarSeccion?.('workflows')}
        />
      )}

      {editando && (
        <EditarPerfilModal
          perfil={perfil}
          onCerrar={() => setEditando(false)}
          onGuardado={alGuardar}
        />
      )}
    </div>
  );
}
