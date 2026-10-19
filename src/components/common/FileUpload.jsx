// src/components/common/FileUpload.jsx
import { useState, useRef } from 'react';

const TIPOS_PERMITIDOS_DEFECTO = [
  'application/pdf',
  'text/plain',
  'text/csv',
  'application/json',
  'image/png',
  'image/jpeg',
  'audio/mpeg',
  'audio/wav',
];

const EXTENSIONES_PERMITIDAS = '.pdf,.png,.jpg,.jpeg,.mp3,.wav,.csv,.txt,.json';
const MAX_TAMANO_MB_DEFECTO = 10;

function formatBytes(bytes) {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

export default function FileUpload({
  onArchivoSeleccionado,
  accept = EXTENSIONES_PERMITIDAS,
  maxSizeMB = MAX_TAMANO_MB_DEFECTO,
  label = 'Subir archivo de entrada',
  subtitulo = 'Formatos: PDF, PNG, JPG, MP3, WAV, CSV, TXT, JSON (Máx. 10 MB)',
  disabled = false,
}) {
  const [archivo, setArchivo] = useState(null);
  const [arrastrando, setArrastrando] = useState(false);
  const [progreso, setProgreso] = useState(0);
  const [estado, setEstado] = useState('idle'); // 'idle' | 'subiendo' | 'completado' | 'error'
  const [errorMsg, setErrorMsg] = useState('');
  const inputRef = useRef(null);

  const validarArchivo = (file) => {
    setErrorMsg('');

    if (!file) return false;

    // Validación de tamaño (máximo 10 MB)
    const tamanoMB = file.size / (1024 * 1024);
    if (tamanoMB > maxSizeMB) {
      setErrorMsg(`El archivo supera el tamaño máximo permitido de ${maxSizeMB} MB (${tamanoMB.toFixed(1)} MB).`);
      setEstado('error');
      return false;
    }

    // Validación de extensión básica
    const extension = '.' + file.name.split('.').pop().toLowerCase();
    const permitidas = accept.split(',').map((ext) => ext.trim().toLowerCase());
    if (!permitidas.includes(extension)) {
      setErrorMsg(`Tipo de archivo no compatible (${extension}). Formatos válidos: ${accept}`);
      setEstado('error');
      return false;
    }

    return true;
  };

  const procesarArchivo = (file) => {
    if (!validarArchivo(file)) return;

    setArchivo(file);
    setEstado('subiendo');
    setProgreso(10);

    // Simulación de carga fluida con temporizador
    const intervalo = setInterval(() => {
      setProgreso((prev) => {
        if (prev >= 100) {
          clearInterval(intervalo);
          setEstado('completado');
          if (onArchivoSeleccionado) {
            onArchivoSeleccionado(file);
          }
          return 100;
        }
        return prev + 30;
      });
    }, 150);
  };

  const handleDragOver = (e) => {
    e.preventDefault();
    if (disabled) return;
    setArrastrando(true);
  };

  const handleDragLeave = (e) => {
    e.preventDefault();
    setArrastrando(false);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setArrastrando(false);
    if (disabled) return;

    const files = e.dataTransfer.files;
    if (files && files.length > 0) {
      procesarArchivo(files[0]);
    }
  };

  const handleInputChange = (e) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      procesarArchivo(files[0]);
    }
  };

  const handleEliminarArchivo = (e) => {
    e.stopPropagation();
    setArchivo(null);
    setProgreso(0);
    setEstado('idle');
    setErrorMsg('');
    if (inputRef.current) inputRef.current.value = '';
    if (onArchivoSeleccionado) onArchivoSeleccionado(null);
  };

  return (
    <div className="w-full space-y-2">
      {label && (
        <label className="block text-xs font-semibold text-slate-700">
          {label}
        </label>
      )}

      {/* Zona de arrastrar y soltar */}
      <div
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        onClick={() => !disabled && inputRef.current?.click()}
        className={`relative border-2 border-dashed rounded-2xl p-6 text-center transition-all cursor-pointer ${
          disabled ? 'opacity-60 cursor-not-allowed bg-slate-50' : ''
        } ${
          arrastrando
            ? 'border-blue-500 bg-blue-50/70 scale-[1.005]'
            : estado === 'error'
            ? 'border-red-300 bg-red-50/30'
            : archivo && estado === 'completado'
            ? 'border-emerald-300 bg-emerald-50/20'
            : 'border-slate-300 hover:border-blue-400 bg-white hover:bg-slate-50/60'
        }`}
      >
        <input
          ref={inputRef}
          type="file"
          accept={accept}
          onChange={handleInputChange}
          disabled={disabled}
          className="hidden"
        />

        {!archivo ? (
          <div className="space-y-2">
            <div className="w-12 h-12 rounded-2xl bg-blue-50 border border-blue-100 flex items-center justify-center mx-auto text-blue-600">
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
              </svg>
            </div>
            <div>
              <p className="text-xs sm:text-sm font-semibold text-slate-800">
                <span className="text-blue-600 hover:underline">Haz clic para seleccionar</span> o arrastra un archivo aquí
              </p>
              <p className="text-[11px] text-slate-400 mt-0.5">{subtitulo}</p>
            </div>
          </div>
        ) : (
          <div className="space-y-3">
            <div className="flex items-center justify-between gap-3 bg-white p-3 rounded-xl border border-slate-200">
              <div className="flex items-center gap-3 overflow-hidden">
                <div className="w-9 h-9 rounded-lg bg-blue-100 text-blue-700 flex items-center justify-center shrink-0 font-bold text-xs">
                  {archivo.name.split('.').pop().toUpperCase()}
                </div>
                <div className="text-left truncate">
                  <p className="text-xs font-semibold text-slate-900 truncate">
                    {archivo.name}
                  </p>
                  <p className="text-[10px] text-slate-400">
                    {formatBytes(archivo.size)}
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={handleEliminarArchivo}
                className="text-slate-400 hover:text-red-500 p-1.5 rounded-lg hover:bg-slate-100 transition shrink-0"
                title="Quitar archivo"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {/* Barra de progreso */}
            {estado === 'subiendo' && (
              <div className="w-full bg-slate-100 rounded-full h-1.5 overflow-hidden">
                <div
                  className="bg-blue-600 h-1.5 rounded-full transition-all duration-200"
                  style={{ width: `${progreso}%` }}
                />
              </div>
            )}

            {estado === 'completado' && (
              <p className="text-[11px] font-semibold text-emerald-600 flex items-center justify-center gap-1">
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                </svg>
                Archivo listo para procesar
              </p>
            )}
          </div>
        )}
      </div>

      {/* Mensaje de error de validación */}
      {errorMsg && (
        <p className="text-xs font-medium text-red-600 flex items-center gap-1 mt-1 pl-1">
          <svg className="w-3.5 h-3.5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          {errorMsg}
        </p>
      )}
    </div>
  );
}
