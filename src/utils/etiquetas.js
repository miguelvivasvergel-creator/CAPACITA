// Los nombres de campo son ASCII (tamano_fuente, todo_mayusculas): para mostrarlos se separan
// las palabras y se devuelven las tildes y la ñ de las palabras frecuentes en español.
const TILDES = {
  tamano: 'tamaño', ano: 'año', anos: 'años', mayusculas: 'mayúsculas', minusculas: 'minúsculas',
  titulo: 'título', subtitulo: 'subtítulo', seccion: 'sección', pagina: 'página', paginas: 'páginas',
  numero: 'número', numeros: 'números', informacion: 'información', descripcion: 'descripción',
  direccion: 'dirección', posicion: 'posición', opcion: 'opción', configuracion: 'configuración',
  resolucion: 'resolución', rotacion: 'rotación', saturacion: 'saturación', compresion: 'compresión',
  extension: 'extensión', version: 'versión', grafico: 'gráfico', graficos: 'gráficos',
  metrica: 'métrica', metricas: 'métricas', estadistica: 'estadística', estadisticas: 'estadísticas',
  categoria: 'categoría', categorias: 'categorías', telefono: 'teléfono', codigo: 'código',
  imagenes: 'imágenes', parrafo: 'párrafo', parrafos: 'párrafos', linea: 'línea', lineas: 'líneas',
  maximo: 'máximo', minimo: 'mínimo', automatico: 'automático', basico: 'básico', clasica: 'clásica',
  clasico: 'clásico', energia: 'energía', dia: 'día', dias: 'días', ultimo: 'último', ultima: 'última',
};

/** «tamano_fuente» → «Tamaño fuente»; «todo_mayusculas» → «Todo mayúsculas». */
export function etiquetaLegible(nombre = '') {
  const texto = String(nombre).replaceAll('_', ' ').trim().split(/\s+/).map((palabra) => {
    const tilde = TILDES[palabra.toLowerCase()];
    if (!tilde) return palabra;
    return palabra[0] === palabra[0].toUpperCase() ? tilde[0].toUpperCase() + tilde.slice(1) : tilde;
  }).join(' ');
  return texto.replace(/^./, (letra) => letra.toUpperCase());
}
