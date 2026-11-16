import { useEffect, useState } from 'react';
import { buscarTodo } from '../services/busqueda';

/** Resultados vinculados a su consulta: descarta respuestas antiguas y cancela al salir. */
export function useBusqueda(texto, { limite = 5, delay = 300, modo = 'text', scope = 'available', revision = 0, category = '', owner = '', dataType = '' } = {}) {
  const consulta = texto.trim();
  const clave = JSON.stringify([consulta, limite, modo, scope, revision, category, owner, dataType]);
  const [respuesta, setRespuesta] = useState(null);

  useEffect(() => {
    if (consulta.length < 2) return;
    const controller = new AbortController();
    const timer = setTimeout(() => {
      buscarTodo(consulta, limite, { signal: controller.signal, modo, scope, category, owner, dataType })
        .then((data) => {
          if (!controller.signal.aborted) setRespuesta({ clave, data, error: '' });
        })
        .catch((cause) => {
          if (!controller.signal.aborted) setRespuesta({ clave, data: null, error: cause.message });
        });
    }, delay);
    return () => {
      clearTimeout(timer);
      controller.abort();
    };
  }, [consulta, limite, delay, modo, scope, revision, clave, category, owner, dataType]);

  const vigente = consulta.length >= 2 && respuesta?.clave === clave;
  return {
    res: vigente ? respuesta.data : null,
    error: vigente ? respuesta.error : false,
    cargando: consulta.length >= 2 && !vigente,
  };
}
