// src/pages/Capacidades/MisCapacidades.jsx
import { useState, useMemo } from 'react';
import TarjetaCapacidad from '../../components/capabilities/TarjetaCapacidad';
import CapacidadesEmptyState from '../../components/capabilities/CapacidadesEmptyState';
import DetalleCapacidad from './DetalleCapacidad';

const CATEGORIAS_OPCIONES = [
  { value: 'Todas', label: 'Todas las categorías' },
  { value: 'Texto', label: 'Texto' },
  { value: 'Imagen', label: 'Imagen' },
  { value: 'PDF', label: 'PDF' },
  { value: 'Audio', label: 'Audio' },
  { value: 'Datos', label: 'Datos' },
];

export default function MisCapacidades({
  capacidades = [],
  onCrearClick,
  esMisCapacidades = false,
}) {
  const [busqueda, setBusqueda] = useState('');
  const [categoriaSeleccionada, setCategoriaSeleccionada] = useState('Todas');
  const [capacidadSeleccionada, setCapacidadSeleccionada] = useState(null);

  // Si estamos en "Mis capacidades" y el usuario no tiene ninguna (vacío por defecto)
  if (esMisCapacidades && capacidades.length === 0) {
    return (
      <CapacidadesEmptyState
        onCrearClick={onCrearClick}
        onSeleccionarPlantilla={(plantilla) => {
          if (onCrearClick) onCrearClick(plantilla);
        }}
      />
    );
  }

  // Filtrado de capacidades según búsqueda y categoría del menú desplegable
  const capacidadesFiltradas = useMemo(() => {
    return capacidades.filter((cap) => {
      const coincideTexto =
        cap.name.toLowerCase().includes(busqueda.toLowerCase()) ||
        cap.description.toLowerCase().includes(busqueda.toLowerCase());

      const coincideCategoria =
        categoriaSeleccionada === 'Todas' ||
        cap.category.toLowerCase() === categoriaSeleccionada.toLowerCase() ||
        cap.input_type.toLowerCase() === categoriaSeleccionada.toLowerCase() ||
        cap.output_type.toLowerCase() === categoriaSeleccionada.toLowerCase();

      return coincideTexto && coincideCategoria;
    });
  }, [capacidades, busqueda, categoriaSeleccionada]);

  return (
    <div className="space-y-6">
      {/* Barra de Filtros: Buscador + Botón Desplegable Único de Categorías */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
        {/* Input de búsqueda */}
        <div className="relative flex-1 max-w-md">
          <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z" />
            </svg>
          </div>
          <input
            type="text"
            value={busqueda}
            onChange={(e) => setBusqueda(e.target.value)}
            placeholder="Filtrar por nombre o etiqueta"
            className="w-full pl-10 pr-4 py-2.5 text-xs sm:text-sm rounded-2xl bg-white border border-slate-200/90 text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition shadow-xs"
          />
        </div>

        {/* ÚNICO BOTÓN DESPLEGABLE para filtrar por categoría */}
        <div className="relative shrink-0">
          <div className="relative">
            <select
              value={categoriaSeleccionada}
              onChange={(e) => setCategoriaSeleccionada(e.target.value)}
              className="appearance-none bg-white border border-slate-200/90 hover:border-slate-300 text-slate-700 text-xs sm:text-sm font-semibold rounded-2xl pl-4 pr-10 py-2.5 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition shadow-xs cursor-pointer"
            >
              {CATEGORIAS_OPCIONES.map((op) => (
                <option key={op.value} value={op.value}>
                  {op.label}
                </option>
              ))}
            </select>
            <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center pr-3.5 text-slate-400">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            </div>
          </div>
        </div>
      </div>

      {/* Cuadrícula de Tarjetas (3 columnas) */}
      {capacidadesFiltradas.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {capacidadesFiltradas.map((cap) => (
            <TarjetaCapacidad
              key={cap.id}
              capacidad={cap}
              onVer={(c) => setCapacidadSeleccionada(c)}
              onUsar={(c) => alert(`Usando capacidad: ${c.name}`)}
            />
          ))}
        </div>
      ) : (
        <div className="text-center py-12 bg-white rounded-2xl border border-slate-200/70 p-8">
          <p className="text-sm font-semibold text-slate-700">No se encontraron capacidades</p>
          <p className="text-xs text-slate-400 mt-1">Intenta con otro término o cambia la categoría en el filtro.</p>
        </div>
      )}

      {/* Botón Cargar más */}
      {capacidadesFiltradas.length > 0 && (
        <div className="flex justify-center pt-6 pb-4">
          <button
            type="button"
            onClick={() => alert('Cargando más capacidades...')}
            className="inline-flex items-center gap-2 px-5 py-2 text-xs font-semibold text-slate-600 bg-white border border-slate-200/90 hover:bg-slate-50 rounded-full transition shadow-xs cursor-pointer"
          >
            <svg className="w-3.5 h-3.5 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
            <span>Cargar más</span>
          </button>
        </div>
      )}

      {/* Modal de Detalle de Capacidad */}
      {capacidadSeleccionada && (
        <DetalleCapacidad
          capacidad={capacidadSeleccionada}
          onCerrar={() => setCapacidadSeleccionada(null)}
          onUsar={(c) => {
            alert(`Ejecutando ${c.name}`);
            setCapacidadSeleccionada(null);
          }}
          onClonar={(c) => {
            alert(`Capacidad "${c.name}" clonada exitosamente.`);
            setCapacidadSeleccionada(null);
          }}
        />
      )}
    </div>
  );
}