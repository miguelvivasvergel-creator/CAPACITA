// Solo contexto para volver al planner; nunca permisos, consentimiento, código o resultados.
const PREFIX = 'capacita:planner-draft:v1:';
const MAX_AGE = 48 * 60 * 60 * 1000;
const UUID = /^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/i;
const keyFor = (userId) => typeof userId === 'string' && userId.length > 0 && userId.length <= 128 ? PREFIX + encodeURIComponent(userId) : null;
const storageFor = () => { try { return globalThis.sessionStorage; } catch { return null; } };

export function guardarObjetivoPlan(userId, value, storage = storageFor(), now = Date.now()) {
  const key = keyFor(userId);
  if (!key || typeof value?.objective !== 'string' || value.objective.trim().length < 10 || value.objective.length > 2000 || !['text', 'semantic'].includes(value.mode)) return null;
  if (value.capabilityId && !UUID.test(value.capabilityId)) return null;
  const draft = { version: 1, userId, objective: value.objective, mode: value.mode, updatedAt: now,
    capabilityId: value.capabilityId || null };
  try { if (!storage) return null; storage.setItem(key, JSON.stringify(draft)); return draft; } catch { return null; }
}

export function leerObjetivoPlan(userId, storage = storageFor(), now = Date.now()) {
  const key = keyFor(userId);
  if (!key) return null;
  try {
    const raw = storage?.getItem(key);
    if (!raw) return null;
    const draft = JSON.parse(raw);
    if (draft.version !== 1 || draft.userId !== userId || typeof draft.objective !== 'string' || draft.objective.trim().length < 10 || draft.objective.length > 2000 || !['text', 'semantic'].includes(draft.mode)
      || !Number.isFinite(draft.updatedAt) || now - draft.updatedAt > MAX_AGE || draft.updatedAt > now + 300000 || (draft.capabilityId && !UUID.test(draft.capabilityId))) {
      storage.removeItem(key); return null;
    }
    return { version: 1, userId, objective: draft.objective, mode: draft.mode, updatedAt: draft.updatedAt, capabilityId: draft.capabilityId || null };
  } catch { return null; }
}

export function descartarObjetivoPlan(userId, storage = storageFor()) {
  try { const key = keyFor(userId); if (key) storage?.removeItem(key); } catch { /* El almacenamiento puede estar bloqueado. */ }
}

export function limpiarObjetivosPlan(activeUserId = null, storage = storageFor()) {
  try {
    if (!storage) return;
    const active = keyFor(activeUserId);
    const keys = Array.from({ length: storage.length }, (_, index) => storage.key(index));
    for (const key of keys) if (key?.startsWith(PREFIX) && key !== active) storage.removeItem(key);
  } catch { /* No tocar otros datos de sesión ni impedir cerrar sesión. */ }
}
