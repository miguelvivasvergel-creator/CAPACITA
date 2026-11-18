// Archivos en los contratos: texto base64 (sin "data:") con contentEncoding "base64" y
// contentMediaType. Todo ocurre en el navegador; el backend solo ve el texto base64.

const IMAGEN_JPEG = 'image/jpeg', IMAGEN_PNG = 'image/png', PDF = 'application/pdf';
const WORD = 'application/vnd.openxmlformats-officedocument.wordprocessingml.document';
const EXCEL = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';

export const TIPOS = {
  [IMAGEN_JPEG]: { nombre: 'foto', ext: 'jpg', icono: '🖼️', acepta: 'image/*' },
  [IMAGEN_PNG]: { nombre: 'imagen', ext: 'png', icono: '🖼️', acepta: 'image/*' },
  [PDF]: { nombre: 'PDF', ext: 'pdf', icono: '📄', acepta: '.pdf,application/pdf' },
  [WORD]: { nombre: 'Word', ext: 'docx', icono: '📝', acepta: '.docx' },
  [EXCEL]: { nombre: 'Excel', ext: 'xlsx', icono: '📊', acepta: '.xlsx' },
};
const MUESTRAS = { foto: 'foto.jpg', pdf: 'documento.pdf', word: 'documento.docx', excel: 'hoja.xlsx' };
// Con 4 MB de límite total, un archivo de hasta ~2,8 MB cabe en base64.
const MAX_BYTES = 2_800_000;
const LADO_MAX = 1600;

export const esArchivo = (spec) => spec?.contentEncoding === 'base64';
export const infoTipo = (media) => TIPOS[media] || { nombre: 'archivo', ext: 'bin', icono: '📎', acepta: '' };

function aBase64(buffer) {
  const bytes = new Uint8Array(buffer); let texto = '';
  for (let i = 0; i < bytes.length; i += 0x8000) texto += String.fromCharCode(...bytes.subarray(i, i + 0x8000));
  return btoa(texto);
}

// Las fotos se reducen (máx. 1600 px) para que viajen rápido y quepan en el límite.
async function imagenReducida(archivo, media) {
  const bitmap = await createImageBitmap(archivo);
  const escala = Math.min(1, LADO_MAX / Math.max(bitmap.width, bitmap.height));
  const lienzo = document.createElement('canvas');
  lienzo.width = Math.round(bitmap.width * escala); lienzo.height = Math.round(bitmap.height * escala);
  lienzo.getContext('2d').drawImage(bitmap, 0, 0, lienzo.width, lienzo.height);
  bitmap.close?.();
  const blob = await new Promise((ok) => lienzo.toBlob(ok, media === IMAGEN_PNG ? IMAGEN_PNG : IMAGEN_JPEG, 0.88));
  if (!blob) throw new Error('No pude leer esa imagen. Prueba con una foto JPG o PNG.');
  return blob;
}

/** Lee un archivo elegido por la persona y lo deja listo para el contrato. */
export async function leerArchivo(archivo, media) {
  const esImagen = media?.startsWith('image/');
  if (esImagen && !archivo.type.startsWith('image/')) throw new Error('Aquí necesito una foto o imagen (JPG o PNG).');
  if (!esImagen && media && TIPOS[media] && !archivo.name.toLowerCase().endsWith(`.${TIPOS[media].ext}`)) {
    throw new Error(`Aquí necesito un archivo ${TIPOS[media].nombre} (.${TIPOS[media].ext}).`);
  }
  const contenido = esImagen ? await imagenReducida(archivo, media) : archivo;
  if (contenido.size > MAX_BYTES) throw new Error('El archivo es muy grande (máximo ~2,8 MB). Prueba con uno más liviano.');
  return aBase64(await contenido.arrayBuffer());
}

/** Reconoce el formato por sus primeros bytes (para mostrar o descargar resultados). */
export function detectarTipo(base64) {
  if (typeof base64 !== 'string' || base64.length < 200 || !/^[A-Za-z0-9+/]+=*$/.test(base64.slice(0, 400))) return null;
  if (base64.startsWith('/9j/')) return IMAGEN_JPEG;
  if (base64.startsWith('iVBORw0KGgo')) return IMAGEN_PNG;
  if (base64.startsWith('JVBER')) return PDF;
  if (base64.startsWith('UEsDB')) {
    try {
      const texto = atob(base64);
      if (texto.includes('word/')) return WORD;
      if (texto.includes('xl/')) return EXCEL;
    } catch { return null; }
    return 'application/zip';
  }
  return null;
}

export const urlDatos = (base64, media) => `data:${media};base64,${base64}`;
export const tamano = (base64) => `${Math.max(1, Math.round((base64.length * 3) / 4 / 1024))} KB`;

export function descargar(base64, media, nombre = 'resultado') {
  const bytes = Uint8Array.from(atob(base64), (c) => c.charCodeAt(0));
  const url = URL.createObjectURL(new Blob([bytes], { type: media }));
  const enlace = document.createElement('a');
  enlace.href = url; enlace.download = `${nombre}.${infoTipo(media).ext}`;
  document.body.appendChild(enlace); enlace.click(); enlace.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

/** Cambia "MUESTRA:foto" (ejemplos de la fábrica) por un archivo real de prueba. */
export async function conMuestras(valor) {
  if (typeof valor === 'string' && valor.startsWith('MUESTRA:')) {
    const archivo = MUESTRAS[valor.slice(8).trim().toLowerCase()] || MUESTRAS.foto;
    let respuesta;
    try {
      respuesta = await fetch(`/muestras/${archivo}`);
    } catch {
      throw new Error('No pude conectar con la página para traer el archivo de muestra. ¿Se cerró "npm run dev"? Vuelve a iniciarlo y reintenta.');
    }
    if (!respuesta.ok) throw new Error('No encontré los archivos de muestra para probar la herramienta.');
    return aBase64(await respuesta.arrayBuffer());
  }
  if (Array.isArray(valor)) return Promise.all(valor.map(conMuestras));
  if (valor && typeof valor === 'object') {
    return Object.fromEntries(await Promise.all(Object.entries(valor).map(async ([k, v]) => [k, await conMuestras(v)])));
  }
  return valor;
}
