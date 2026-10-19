// src/services/perfil.js
// Carga todo lo que muestra la pantalla de Perfil.
// Si algún endpoint todavía no existe o falla, usa los datos falsos de src/mocks/profile.js.
import { api } from '../api';
import { obtenerPerfilMock } from '../mocks/profile';

export async function cargarPerfil(username, usuarioActual) {
  const usuario = encodeURIComponent(username);
  const mock = obtenerPerfilMock(username, usuarioActual);

  const [perfil, actividad, capacidades, workflows] = await Promise.allSettled([
    api(`/users/${usuario}`),
    api(`/users/${usuario}/activity`),
    api(`/capabilities?scope=available&owner=${usuario}`), // Módulo B (Franklin)
    api(`/workflows?scope=available&owner=${usuario}`), // Módulo C (Luis Miguel)
  ]);

  // Sin perfil real ni de ejemplo: el usuario no existe
  if (perfil.status === 'rejected' && !mock) return null;

  const valorO = (resultado, respaldo) =>
    resultado.status === 'fulfilled' ? resultado.value : respaldo;

  return {
    perfil: {
      ...valorO(perfil, mock),
      capabilities: valorO(capacidades, { items: mock?.capabilities ?? [] }).items,
      workflows: valorO(workflows, { items: mock?.workflows ?? [] }).items,
      activity: valorO(actividad, { items: mock?.activity ?? [] }).items,
    },
    // Avisa en pantalla si algo se está mostrando con datos de ejemplo
    deEjemplo: [perfil, actividad, capacidades, workflows].some((r) => r.status === 'rejected'),
  };
}

/** Guarda nombre y bio; si hay foto nueva, la sube después. Devuelve el perfil actualizado. */
export async function guardarPerfil({ display_name, bio, foto }) {
  let actualizado = await api('/users/me', { method: 'PATCH', body: { display_name, bio } });

  if (foto) {
    const formulario = new FormData();
    formulario.append('file', foto);
    actualizado = await api('/users/me/avatar', { method: 'POST', body: formulario });
  }

  return actualizado;
}
