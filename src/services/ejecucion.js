// src/services/ejecucion.js
// Llamadas al backend para ejecutar un workflow o una capacidad.
import { api } from '../api';
import { obtenerEjecutableMock } from '../mocks/runs';

export const ESTADOS_EN_CURSO = ['queued', 'running'];

/**
 * Trae el workflow o la capacidad a ejecutar (Módulo C / Módulo B).
 * Mientras esos endpoints no existan, usa los datos de src/mocks/runs.js.
 */
export async function cargarEjecutable(tipo, id) {
  const ruta = tipo === 'workflow' ? `/workflows/${id}` : `/capabilities/${id}`;
  try {
    return await api(ruta);
  } catch {
    return obtenerEjecutableMock(tipo, id);
  }
}

/** Sube el archivo (si hay) y crea la ejecución. Devuelve la ejecución recién creada. */
export async function iniciarEjecucion({ ejecutable, texto, archivo }) {
  const cuerpo = {
    [ejecutable.tipo === 'workflow' ? 'workflow_id' : 'capability_id']: ejecutable.id,
    accepted_permissions: ejecutable.required_permissions,
  };

  if (archivo) {
    const formulario = new FormData();
    formulario.append('file', archivo);
    try {
      const subido = await api('/files', { method: 'POST', body: formulario });
      cuerpo.file_id = subido.file_id;
    } catch (err) {
      throw new Error(`No se pudo subir el archivo: ${err.message}`);
    }
  } else {
    cuerpo.text = texto;
  }

  return api('/runs', { method: 'POST', body: cuerpo });
}

/** Estado actual de una ejecución propia. */
export function consultarEjecucion(runId) {
  return api(`/runs/${runId}`);
}
