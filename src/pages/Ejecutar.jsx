// src/pages/Ejecutar.jsx
// Ejecución y resultado (#ejecutar/:tipo/:id). Módulo D — Fahida.
// Por ahora con datos falsos: los pasos avanzan con un temporizador.
import { useState, useEffect } from 'react';
import PermisosModal from '../components/runs/PermisosModal';
import PasosEjecucion from '../components/runs/PasosEjecucion';
import EntradaEjecucion from '../components/runs/EntradaEjecucion';
import ResultadoEjecucion from '../components/runs/ResultadoEjecucion';
import EstadoBadge from '../components/runs/EstadoBadge';
import TipoDato from '../components/common/TipoDato';
import { EstadoVacio } from '../components/profile/PerfilListas';
import { obtenerEjecutableMock } from '../mocks/runs';

const MS_POR_PASO = 1500;

export default function Ejecutar({ tipo, id }) {
  const ejecutable = obtenerEjecutableMock(tipo, id);

  const [texto, setTexto] = useState('');
  const [archivo, setArchivo] = useState(null);
  const [mostrarPermisos, setMostrarPermisos] = useState(false);
  const [estado, setEstado] = useState('listo'); // listo | running | completed
  const [pasoActual, setPasoActual] = useState(0);

  // Simulación: cada MS_POR_PASO se completa un paso
  useEffect(() => {
    if (estado !== 'running') return;
    const temporizador = setTimeout(() => {
      const siguiente = pasoActual + 1;
      setPasoActual(siguiente);
      if (siguiente === ejecutable.steps.length) setEstado('completed');
    }, MS_POR_PASO);
    return () => clearTimeout(temporizador);
  }, [estado, pasoActual, ejecutable]);

  if (!ejecutable) {
    return (
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <EstadoVacio
          icono="🔍"
          titulo="No encontrado"
          texto="Este workflow no existe o no tienes acceso a él."
        />
      </div>
    );
  }

  const estadoDelPaso = (i) => {
    if (i < pasoActual) return 'completed';
    if (i === pasoActual && estado === 'running') return 'running';
    return 'pending';
  };
  const pasos = ejecutable.steps.map((paso, i) => ({ ...paso, status: estadoDelPaso(i) }));

  const hayEntrada = ejecutable.input_type === 'texto' ? texto.trim() !== '' : archivo !== null;
  const ejecutando = estado === 'running';

  const iniciarEjecucion = () => {
    setMostrarPermisos(false);
    setPasoActual(0);
    setEstado('running');
  };

  const reiniciar = () => {
    setPasoActual(0);
    setEstado('listo');
  };

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-10">
      {/* Encabezado */}
      <button
        onClick={() => window.history.back()}
        className="text-sm font-medium text-slate-500 hover:text-slate-800 cursor-pointer"
      >
        ← Volver
      </button>

      <div className="mt-3 pb-6 border-b border-slate-200/80">
        <p className="text-xs font-semibold uppercase tracking-wider text-[#1a56db]">
          Ejecutar {ejecutable.tipo === 'workflow' ? 'workflow' : 'capacidad'}
        </p>
        <h1 className="mt-1 text-3xl sm:text-4xl font-extrabold text-slate-900 tracking-tight">
          {ejecutable.name}
        </h1>
        <p className="mt-2 text-sm sm:text-base text-slate-600 max-w-2xl">{ejecutable.description}</p>
        <div className="mt-4 flex items-center gap-2 text-xs text-slate-500">
          <TipoDato tipo={ejecutable.input_type} />
          <span>→</span>
          <TipoDato tipo={ejecutable.output_type} />
          <span className="ml-2">· {ejecutable.steps.length} pasos</span>
        </div>
      </div>

      <div className="mt-6 grid grid-cols-1 lg:grid-cols-5 gap-6 items-start">
        {/* Columna izquierda: entrada y resultado */}
        <div className="lg:col-span-3 space-y-6">
          <section className="bg-white rounded-2xl border border-slate-200/80 shadow-xs p-5 sm:p-6">
            <h2 className="font-bold text-slate-900">1. Entrada</h2>
            <p className="mt-0.5 mb-4 text-sm text-slate-500">
              Lo que subas aquí es privado: solo tú puedes verlo.
            </p>

            <EntradaEjecucion
              tipo={ejecutable.input_type}
              texto={texto}
              archivo={archivo}
              onTexto={setTexto}
              onArchivo={setArchivo}
              deshabilitado={ejecutando}
            />

            <div className="mt-5 flex justify-end">
              {estado === 'completed' ? (
                <button
                  onClick={reiniciar}
                  className="flex items-center gap-2 bg-white hover:bg-slate-50 text-slate-700 text-sm font-semibold px-4 py-2.5 rounded-lg border border-slate-200 transition-colors cursor-pointer"
                >
                  ↻ Ejecutar de nuevo
                </button>
              ) : (
                <button
                  onClick={() => setMostrarPermisos(true)}
                  disabled={!hayEntrada || ejecutando}
                  className="flex items-center gap-2 bg-[#1a56db] hover:bg-blue-700 active:scale-[0.98] text-white text-sm font-semibold px-5 py-2.5 rounded-lg transition-all shadow-xs cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed disabled:active:scale-100"
                >
                  <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M8 5.14v13.72a1 1 0 001.5.86l11-6.86a1 1 0 000-1.72l-11-6.86A1 1 0 008 5.14z" />
                  </svg>
                  {ejecutando ? 'Ejecutando...' : 'Ejecutar'}
                </button>
              )}
            </div>
          </section>

          {estado === 'completed' && (
            <section className="bg-white rounded-2xl border border-emerald-200 shadow-xs p-5 sm:p-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="font-bold text-slate-900">3. Resultado</h2>
                <EstadoBadge estado="completed" />
              </div>
              <ResultadoEjecucion tipo={ejecutable.output_type} resultado={ejecutable.resultado} />
            </section>
          )}
        </div>

        {/* Columna derecha: pasos */}
        <section className="lg:col-span-2 bg-white rounded-2xl border border-slate-200/80 shadow-xs p-5 sm:p-6">
          <div className="flex items-center justify-between mb-5">
            <h2 className="font-bold text-slate-900">2. Pasos</h2>
            <EstadoBadge estado={estado === 'listo' ? 'pending' : estado} />
          </div>
          <PasosEjecucion pasos={pasos} />
        </section>
      </div>

      {mostrarPermisos && (
        <PermisosModal
          permisos={ejecutable.required_permissions}
          onCancelar={() => setMostrarPermisos(false)}
          onConfirmar={iniciarEjecucion}
        />
      )}
    </div>
  );
}
