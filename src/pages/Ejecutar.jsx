// src/pages/Ejecutar.jsx
// Ejecución y resultado (#ejecutar/:tipo/:id). Módulo D — Fahida.
// Crea la ejecución con POST /runs y consulta GET /runs/{id} cada 1,5 s hasta que termine.
import { useState, useEffect } from 'react';
import PermisosModal from '../components/runs/PermisosModal';
import PasosEjecucion from '../components/runs/PasosEjecucion';
import EntradaEjecucion from '../components/runs/EntradaEjecucion';
import ResultadoEjecucion from '../components/runs/ResultadoEjecucion';
import EstadoBadge from '../components/runs/EstadoBadge';
import TipoDato from '../components/common/TipoDato';
import { EstadoVacio } from '../components/profile/PerfilListas';
import {
  cargarEjecutable,
  iniciarEjecucion,
  consultarEjecucion,
  ESTADOS_EN_CURSO,
} from '../services/ejecucion';

const MS_ENTRE_CONSULTAS = 1500;

export default function Ejecutar({ tipo, id }) {
  const [ejecutable, setEjecutable] = useState(undefined); // undefined = cargando, null = no existe
  const [texto, setTexto] = useState('');
  const [archivo, setArchivo] = useState(null);
  const [mostrarPermisos, setMostrarPermisos] = useState(false);
  const [enviando, setEnviando] = useState(false);
  const [run, setRun] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => {
    cargarEjecutable(tipo, id).then(setEjecutable);
  }, [tipo, id]);

  // Mientras la ejecución siga en curso, se vuelve a consultar su estado
  useEffect(() => {
    if (!run || !ESTADOS_EN_CURSO.includes(run.status)) return;
    const temporizador = setTimeout(async () => {
      try {
        setRun(await consultarEjecucion(run.id));
      } catch (err) {
        setError(err.message);
      }
    }, MS_ENTRE_CONSULTAS);
    return () => clearTimeout(temporizador);
  }, [run]);

  if (ejecutable === undefined) {
    return (
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-10 animate-pulse space-y-6">
        <div className="h-28 rounded-2xl bg-slate-100" />
        <div className="h-64 rounded-2xl bg-slate-100" />
      </div>
    );
  }

  if (ejecutable === null) {
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

  const enCurso = enviando || (run && ESTADOS_EN_CURSO.includes(run.status));
  const terminado = run && !ESTADOS_EN_CURSO.includes(run.status);
  const hayEntrada = ejecutable.input_type === 'texto' ? texto.trim() !== '' : archivo !== null;

  // Antes de ejecutar se muestran los pasos del workflow como pendientes
  const pasos = run?.steps ?? ejecutable.steps.map((paso) => ({ ...paso, status: 'pending' }));
  const estadoGeneral = enviando ? 'queued' : run?.status ?? 'pending';

  const ejecutar = async () => {
    setMostrarPermisos(false);
    setEnviando(true);
    setError('');
    try {
      setRun(await iniciarEjecucion({ ejecutable, texto, archivo }));
    } catch (err) {
      setError(err.message);
    } finally {
      setEnviando(false);
    }
  };

  const reiniciar = () => {
    setRun(null);
    setError('');
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
              deshabilitado={enCurso}
            />

            {error && (
              <p className="mt-4 text-sm text-red-600 bg-red-50 border border-red-100 rounded-lg px-3 py-2">
                {error}
              </p>
            )}

            <div className="mt-5 flex justify-end">
              {terminado ? (
                <button
                  onClick={reiniciar}
                  className="flex items-center gap-2 bg-white hover:bg-slate-50 text-slate-700 text-sm font-semibold px-4 py-2.5 rounded-lg border border-slate-200 transition-colors cursor-pointer"
                >
                  ↻ Ejecutar de nuevo
                </button>
              ) : (
                <button
                  onClick={() => setMostrarPermisos(true)}
                  disabled={!hayEntrada || enCurso}
                  className="flex items-center gap-2 bg-[#1a56db] hover:bg-blue-700 active:scale-[0.98] text-white text-sm font-semibold px-5 py-2.5 rounded-lg transition-all shadow-xs cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed disabled:active:scale-100"
                >
                  <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M8 5.14v13.72a1 1 0 001.5.86l11-6.86a1 1 0 000-1.72l-11-6.86A1 1 0 008 5.14z" />
                  </svg>
                  {enCurso ? 'Ejecutando...' : 'Ejecutar'}
                </button>
              )}
            </div>
          </section>

          {run?.status === 'completed' && (
            <section className="bg-white rounded-2xl border border-emerald-200 shadow-xs p-5 sm:p-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="font-bold text-slate-900">3. Resultado</h2>
                <EstadoBadge estado="completed" />
              </div>
              <ResultadoEjecucion tipo={ejecutable.output_type} resultado={run} />
            </section>
          )}

          {run?.status === 'failed' && (
            <section className="bg-white rounded-2xl border border-red-200 shadow-xs p-5 sm:p-6">
              <div className="flex items-center justify-between mb-2">
                <h2 className="font-bold text-slate-900">3. Resultado</h2>
                <EstadoBadge estado="failed" />
              </div>
              <p className="text-sm text-red-600">{run.error || 'La ejecución no pudo terminar.'}</p>
            </section>
          )}
        </div>

        {/* Columna derecha: pasos */}
        <section className="lg:col-span-2 bg-white rounded-2xl border border-slate-200/80 shadow-xs p-5 sm:p-6">
          <div className="flex items-center justify-between mb-5">
            <h2 className="font-bold text-slate-900">2. Pasos</h2>
            <EstadoBadge estado={estadoGeneral} />
          </div>
          <PasosEjecucion pasos={pasos} />
        </section>
      </div>

      {mostrarPermisos && (
        <PermisosModal
          permisos={ejecutable.required_permissions}
          onCancelar={() => setMostrarPermisos(false)}
          onConfirmar={ejecutar}
        />
      )}
    </div>
  );
}
