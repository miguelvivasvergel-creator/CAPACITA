import { useState } from "react";

// 1. Lista inicial de capacidades
const CAPACIDADES_INICIALES = [
  {
    id: 1,
    titulo: "Eliminar fondo",
    tipo: "Imagen → Imagen",
    categoria: "Imagen",
    descripcion: "Elimina el fondo de una imagen y conserva el objeto principal.",
    color: "bg-blue-50 text-blue-600 border-blue-100",
  },
  {
    id: 2,
    titulo: "Traducir texto",
    tipo: "Texto → Texto",
    categoria: "Texto",
    descripcion: "Traduce cualquier texto a varios idiomas en segundos.",
    color: "bg-cyan-50 text-cyan-600 border-cyan-100",
  },
  {
    id: 3,
    titulo: "Resumir documento",
    tipo: "Documento → Texto",
    categoria: "PDF",
    descripcion: "Genera un resumen claro y conciso de un documento o archivo PDF.",
    color: "bg-purple-50 text-purple-600 border-purple-100",
  },
  {
    id: 4,
    titulo: "Extraer texto de imagen",
    tipo: "Imagen → Texto",
    categoria: "Imagen",
    descripcion: "Obtiene el texto de una imagen o archivo escaneado (OCR).",
    color: "bg-blue-50 text-blue-600 border-blue-100",
  },
  {
    id: 5,
    titulo: "Analizar imagen",
    tipo: "Imagen → Datos",
    categoria: "Imagen",
    descripcion: "Detecta objetos, personas o elementos en una imagen.",
    color: "bg-indigo-50 text-indigo-600 border-indigo-100",
  },
  {
    id: 6,
    titulo: "Clasificar documentos",
    tipo: "Documento → Categoría",
    categoria: "PDF",
    descripcion: "Organiza y clasifica documentos automáticamente por categoría.",
    color: "bg-purple-50 text-purple-600 border-purple-100",
  },
  {
    id: 7,
    titulo: "Transcribir audio",
    tipo: "Audio → Texto",
    categoria: "Audio",
    descripcion: "Convierte grabaciones de audio y notas de voz a texto editable.",
    color: "bg-emerald-50 text-emerald-600 border-emerald-100",
  },
  {
    id: 8,
    titulo: "Generador de voz",
    tipo: "Texto → Audio",
    categoria: "Audio",
    descripcion: "Convierte textos a voz audible con diferentes tonos naturales.",
    color: "bg-emerald-50 text-emerald-600 border-emerald-100",
  },
  {
    id: 9,
    titulo: "Análisis de datos",
    tipo: "Datos → Gráfico",
    categoria: "Datos",
    descripcion: "Interpreta tablas de datos y genera resúmenes gráficos automáticos.",
    color: "bg-amber-50 text-amber-600 border-amber-100",
  },
];

// Categorías disponibles
const CATEGORIAS = ["Todos", "Texto", "Imagen", "PDF", "Audio", "Datos"];

// Colores según categoría
const COLORES_CATEGORIA = {
  Texto: "bg-cyan-50 text-cyan-600 border-cyan-100",
  Imagen: "bg-blue-50 text-blue-600 border-blue-100",
  PDF: "bg-purple-50 text-purple-600 border-purple-100",
  Audio: "bg-emerald-50 text-emerald-600 border-emerald-100",
  Datos: "bg-amber-50 text-amber-600 border-amber-100",
};

export default function Capacidades({ onUsarCapacidad, showToast, modalAbiertoInicial = false }) {
  // 1. Estado de la lista de capacidades
  const [listaCapacidades, setListaCapacidades] = useState(CAPACIDADES_INICIALES);

  // 2. Estados para búsqueda y filtrado
  const [busqueda, setBusqueda] = useState("");
  const [categoriaActiva, setCategoriaActiva] = useState("Todos");

  // 3. Estado del modal para crear nueva capacidad
  const [mostrarModal, setMostrarModal] = useState(modalAbiertoInicial);

  // 4. Estados del formulario de nueva capacidad
  const [nuevoTitulo, setNuevoTitulo] = useState("");
  const [nuevaCategoria, setNuevaCategoria] = useState("Texto");
  const [nuevoTipo, setNuevoTipo] = useState("Texto → Texto");
  const [nuevaDescripcion, setNuevaDescripcion] = useState("");

  // Función para guardar una nueva capacidad
  const handleCrearCapacidad = (e) => {
    e.preventDefault();

    if (!nuevoTitulo.trim()) {
      if (showToast) showToast("Ingresa un nombre para la capacidad.");
      return;
    }
    if (!nuevaDescripcion.trim()) {
      if (showToast) showToast("Ingresa una breve descripción.");
      return;
    }

    const nueva = {
      id: Date.now(),
      titulo: nuevoTitulo.trim(),
      categoria: nuevaCategoria,
      tipo: nuevoTipo.trim() || `${nuevaCategoria} → Resultado`,
      descripcion: nuevaDescripcion.trim(),
      color: COLORES_CATEGORIA[nuevaCategoria] || "bg-blue-50 text-blue-600 border-blue-100",
    };

    // Agregar la nueva capacidad al inicio de la lista
    setListaCapacidades([nueva, ...listaCapacidades]);

    // Limpiar formulario y cerrar modal
    setNuevoTitulo("");
    setNuevaDescripcion("");
    setNuevoTipo("Texto → Texto");
    setNuevaCategoria("Texto");
    setMostrarModal(false);

    if (showToast) {
      showToast(`¡Capacidad "${nueva.titulo}" creada con éxito!`);
    }
  };

  // Filtrar capacidades según la búsqueda y categoría
  const capacidadesFiltradas = listaCapacidades.filter((item) => {
    const coincideCategoria =
      categoriaActiva === "Todos" || item.categoria === categoriaActiva;

    const texto = busqueda.toLowerCase().trim();
    const coincideTexto =
      item.titulo.toLowerCase().includes(texto) ||
      item.descripcion.toLowerCase().includes(texto) ||
      item.tipo.toLowerCase().includes(texto);

    return coincideCategoria && coincideTexto;
  });

  return (
    <div className="space-y-6 max-w-7xl mx-auto w-full">
      {/* Encabezado: Título, Botón Crear y Buscador */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
            Capacidades
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-1">
            Explora, busca y crea nuevas capacidades para transformar información.
          </p>
        </div>

        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
          {/* Botón para abrir el modal de creación */}
          <button
            type="button"
            onClick={() => setMostrarModal(true)}
            className="bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs sm:text-sm py-2.5 px-5 rounded-2xl transition shadow-sm shadow-blue-500/20 flex items-center justify-center gap-2 cursor-pointer active:scale-95"
          >
            <span>➕</span>
            <span>Crear capacidad</span>
          </button>

          {/* Campo de búsqueda */}
          <div className="relative w-full sm:w-64">
            <input
              type="text"
              value={busqueda}
              onChange={(e) => setBusqueda(e.target.value)}
              placeholder="🔍 Buscar..."
              className="w-full px-4 py-2.5 rounded-2xl bg-white border border-slate-200 text-xs sm:text-sm text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition shadow-sm"
            />
            {busqueda && (
              <button
                type="button"
                onClick={() => setBusqueda("")}
                className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-400 hover:text-slate-600 text-xs cursor-pointer"
              >
                ✕
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Botones de filtro por categoría */}
      <div className="flex flex-wrap items-center gap-2">
        {CATEGORIAS.map((cat) => (
          <button
            key={cat}
            type="button"
            onClick={() => setCategoriaActiva(cat)}
            className={`px-4 py-1.5 rounded-full text-xs font-semibold transition cursor-pointer ${
              categoriaActiva === cat
                ? "bg-blue-600 text-white shadow-sm shadow-blue-500/30"
                : "bg-white text-slate-600 border border-slate-200/80 hover:bg-slate-50 hover:text-slate-900"
            }`}
          >
            {cat}
          </button>
        ))}
      </div>

      {/* Cuadrícula de capacidades con .map() */}
      {capacidadesFiltradas.length > 0 ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {capacidadesFiltradas.map((item) => (
            <div
              key={item.id}
              className="bg-white rounded-2xl border border-slate-100 p-5 sm:p-6 shadow-sm hover:shadow-md hover:border-blue-200 transition-all flex flex-col justify-between"
            >
              <div className="space-y-3">
                {/* Etiqueta de tipo y categoría */}
                <div className="flex items-center justify-between">
                  <span className={`text-[11px] font-bold px-2.5 py-1 rounded-lg border ${item.color}`}>
                    {item.categoria}
                  </span>
                  <span className="text-[11px] font-medium text-slate-400">
                    {item.tipo}
                  </span>
                </div>

                {/* Título de la capacidad */}
                <h3 className="text-base font-bold text-slate-900">
                  {item.titulo}
                </h3>

                {/* Descripción */}
                <p className="text-xs text-slate-500 leading-relaxed min-h-[38px]">
                  {item.descripcion}
                </p>
              </div>

              {/* Botón azul Usar */}
              <div className="pt-4 mt-2 border-t border-slate-50">
                <button
                  type="button"
                  onClick={() => onUsarCapacidad && onUsarCapacidad(item)}
                  className="bg-blue-600 hover:bg-blue-700 active:scale-95 text-white font-bold text-xs sm:text-sm py-2 px-6 rounded-full transition shadow-sm shadow-blue-500/20 cursor-pointer"
                >
                  Usar
                </button>
              </div>
            </div>
          ))}
        </div>
      ) : (
        /* Vista cuando no hay resultados */
        <div className="bg-white rounded-2xl border border-slate-100 p-10 text-center space-y-2 shadow-sm">
          <p className="text-sm font-semibold text-slate-700">
            No se encontraron capacidades con &ldquo;{busqueda}&rdquo;
          </p>
          <button
            type="button"
            onClick={() => {
              setBusqueda("");
              setCategoriaActiva("Todos");
            }}
            className="text-xs text-blue-600 font-bold hover:underline cursor-pointer"
          >
            Limpiar búsqueda y filtros
          </button>
        </div>
      )}

      {/* Modal para Crear Nueva Capacidad */}
      {mostrarModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-xs">
          <div className="bg-white rounded-3xl p-6 sm:p-8 max-w-md w-full shadow-2xl border border-slate-100 space-y-5 animate-fadeIn">
            {/* Cabecera del modal */}
            <div className="flex items-center justify-between pb-2 border-b border-slate-100">
              <h2 className="text-lg font-extrabold text-slate-900">
                Crear nueva capacidad
              </h2>
              <button
                type="button"
                onClick={() => setMostrarModal(false)}
                className="text-slate-400 hover:text-slate-600 text-sm cursor-pointer p-1"
              >
                ✕
              </button>
            </div>

            {/* Formulario */}
            <form onSubmit={handleCrearCapacidad} className="space-y-4">
              {/* Nombre */}
              <div className="space-y-1">
                <label className="text-xs font-semibold text-slate-700">
                  Nombre de la capacidad
                </label>
                <input
                  type="text"
                  value={nuevoTitulo}
                  onChange={(e) => setNuevoTitulo(e.target.value)}
                  placeholder="Ej. Detector de objetos"
                  className="w-full px-4 py-2 text-sm rounded-xl bg-slate-50 border border-slate-200 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                />
              </div>

              {/* Categoría */}
              <div className="space-y-1">
                <label className="text-xs font-semibold text-slate-700">
                  Categoría
                </label>
                <select
                  value={nuevaCategoria}
                  onChange={(e) => {
                    setNuevaCategoria(e.target.value);
                    setNuevoTipo(`${e.target.value} → ${e.target.value === "Imagen" ? "Datos" : "Texto"}`);
                  }}
                  className="w-full px-4 py-2 text-sm rounded-xl bg-slate-50 border border-slate-200 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 cursor-pointer"
                >
                  <option value="Texto">Texto</option>
                  <option value="Imagen">Imagen</option>
                  <option value="PDF">PDF</option>
                  <option value="Audio">Audio</option>
                  <option value="Datos">Datos</option>
                </select>
              </div>

              {/* Tipo de transformación */}
              <div className="space-y-1">
                <label className="text-xs font-semibold text-slate-700">
                  Transformación (Entrada → Salida)
                </label>
                <input
                  type="text"
                  value={nuevoTipo}
                  onChange={(e) => setNuevoTipo(e.target.value)}
                  placeholder="Ej. Imagen → Datos"
                  className="w-full px-4 py-2 text-sm rounded-xl bg-slate-50 border border-slate-200 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                />
              </div>

              {/* Descripción */}
              <div className="space-y-1">
                <label className="text-xs font-semibold text-slate-700">
                  Descripción
                </label>
                <textarea
                  rows="3"
                  value={nuevaDescripcion}
                  onChange={(e) => setNuevaDescripcion(e.target.value)}
                  placeholder="Explica brevemente qué realiza esta capacidad..."
                  className="w-full px-4 py-2 text-sm rounded-xl bg-slate-50 border border-slate-200 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 resize-none"
                />
              </div>

              {/* Botones de acción */}
              <div className="flex items-center justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setMostrarModal(false)}
                  className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-100 transition cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold transition shadow-sm shadow-blue-500/20 cursor-pointer active:scale-95"
                >
                  Guardar capacidad
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
