import { useEffect, useState } from 'react';
import { buscarTodo } from '../services/dotnet';

/** Resultados vinculados a su consulta: descarta respuestas antiguas y cancela al salir. */
export function useBusqueda(texto, { limite = 5, delay = 300 } = {}) {
  const consulta = texto.trim();
  const [respuesta, setRespuesta] = useState(null);

  useEffect(() => {
    if (consulta.length < 2) return;
    const controller = new AbortController();
    const timer = setTimeout(() => {
      buscarTodo(consulta, limite, { signal: controller.signal })
        .then((data) => {
          if (!controller.signal.aborted) setRespuesta({ consulta, limite, data, error: false });
        })
        .catch(() => {
          if (!controller.signal.aborted) setRespuesta({ consulta, limite, data: null, error: true });
        });
    }, delay);
    return () => {
      clearTimeout(timer);
      controller.abort();
    };
  }, [consulta, limite, delay]);

  const vigente = consulta.length >= 2 && respuesta?.consulta === consulta && respuesta?.limite === limite;
  return {
    res: vigente ? respuesta.data : null,
    error: vigente ? respuesta.error : false,
    cargando: consulta.length >= 2 && !vigente,
  };
}
