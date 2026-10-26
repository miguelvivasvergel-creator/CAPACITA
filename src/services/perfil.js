// src/services/perfil.js
// carga todo lo que se ve en la pantalla de perfil
// Si algún endpoint todavía no existe o falla usa los datos falsos de la api de vs community
import { getPerfil } from './capacitaApi';
import { api } from '../api';
import { obtenerPerfilMock } from '../mocks/profile';

export async function cargarPerfil(username, usuarioActual) {
    // 1) Intentar con la API en .NET (datos reales de la base de datos)
  try {
    const perfilReal = await getPerfil(username);
    return { perfil: perfilReal, deEjemplo: false };
  } catch {
    // 2) Si falla (API apagada o usuario no existe), sigue el flujo anterior con mocks
  }
  const usuario = encodeURIComponent(username);
  const mock = obtenerPerfilMock(username, usuarioActual);

  const [perfil, actividad, capacidades, workflows] = await Promise.allSettled([
    api(`/users/${usuario}`),
    api(`/users/${usuario}/activity`),
    api(`/capabilities?scope=available&owner=${usuario}`), 
    api(`/workflows?scope=available&owner=${usuario}`), 
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
