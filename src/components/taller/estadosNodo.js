// Estados visibles de cada nodo del taller; el backend sigue siendo la fuente de verdad.
// tono: color del punto y del borde (ver .nodo-taller--<tono> en workspace.css).
// pulso: el nodo late mientras trabaja, como los nodos del login.
export const ESTADOS_NODO = {
  espera: { icono: 'circulo', texto: 'En espera', tono: 'espera' },
  queued: { icono: 'reloj', texto: 'En cola', tono: 'espera' },
  pending: { icono: 'circulo', texto: 'En espera', tono: 'espera' },
  running: { icono: 'actualizar', texto: 'Trabajando', tono: 'activo', pulso: true },
  completed: { icono: 'ok', texto: 'Listo', tono: 'listo' },
  failed: { icono: 'error', texto: 'Falló', tono: 'fallo' },
  interrupted: { icono: 'error', texto: 'Interrumpido', tono: 'fallo' },
  skipped: { icono: 'saltar', texto: 'Omitido', tono: 'omitido' },
  creando: { icono: 'herramienta', texto: 'Creándose', tono: 'creando', pulso: true },
  escribiendo: { icono: 'lapiz', texto: 'Escribiendo el código', tono: 'creando', pulso: true },
  probando: { icono: 'matraz', texto: 'Probándose aislada', tono: 'activo', pulso: true },
  corrigiendo: { icono: 'herramienta', texto: 'Corrigiéndose', tono: 'creando', pulso: true },
  aprobar: { icono: 'candado', texto: 'Espera tu aprobación', tono: 'aprobar' },
};

// Recorrido de toda solución, en el orden que ve la persona (componente RutaTaller).
export const ETAPAS = [
  { id: 'pedir', titulo: 'Pides', icono: 'guiado', ayuda: 'Cuéntalo con tus palabras o sube un archivo' },
  { id: 'entender', titulo: 'Entiendo', icono: 'chispa', ayuda: 'Te pregunto solo lo que falta' },
  { id: 'armar', titulo: 'Armo', icono: 'soluciones', ayuda: 'Reutilizo herramientas y creo las que falten' },
  { id: 'revisar', titulo: 'Revisas', icono: 'ojo', ayuda: 'Ves el proceso y apruebas antes de actuar' },
  { id: 'resultado', titulo: 'Resultado', icono: 'resultados', ayuda: 'Se ejecuta de verdad y queda guardado' },
];

/**
 * Deduce la etapa visible a partir del estado real del chat. Es solo presentación:
 * no decide nada del flujo, que sigue en ChatTaller y en el backend.
 */
export function etapaActual({ conversacion, ocupado, plan, creando, runId }) {
  if (runId) return 'resultado';
  if (plan) return 'revisar';
  if (creando || (conversacion && ocupado)) return 'armar';
  if (conversacion) return 'entender';
  return 'pedir';
}
