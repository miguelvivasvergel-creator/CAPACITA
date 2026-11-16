// Recorrido acotado: no confundir una primera página con el total del usuario.
export async function contarPaginas(fetchPage, signal, maxPages = 10) {
  const seen = new Set();
  const cursors = new Set();
  const states = {};
  let cursor;
  for (let pageNumber = 0; pageNumber < maxPages; pageNumber += 1) {
    signal?.throwIfAborted();
    const page = await fetchPage(cursor, signal);
    signal?.throwIfAborted();
    if (!page || !Array.isArray(page.items) || !('next_cursor' in page)) throw new Error('Respuesta de lista inválida.');
    for (const item of page.items) {
      if (!item.id) throw new Error('Registro sin identificador.');
      if (seen.has(item.id)) continue;
      seen.add(item.id);
      if (item.status) states[item.status] = (states[item.status] || 0) + 1;
    }
    if (!page.next_cursor) return { count: seen.size, truncated: false, states };
    if (cursors.has(page.next_cursor)) throw new Error('No se pudo completar la paginación.');
    cursors.add(page.next_cursor);
    cursor = page.next_cursor;
  }
  return { count: seen.size, truncated: true, states };
}
