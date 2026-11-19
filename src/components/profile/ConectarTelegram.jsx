import { useEffect, useRef, useState } from 'react';
import { desvincularTelegram, estadoTelegram, vincularTelegram } from '../../services/telegram';

const BOTON = 'min-h-11 rounded-xl px-4 py-2 text-sm font-semibold disabled:opacity-50';

/**
 * Conectar el Telegram de la persona: genera un código de un solo uso (15 min), abre el bot con
 * él y espera a que toque «Iniciar». Solo ese chat recibe lo que ella pida enviar a Telegram.
 */
export default function ConectarTelegram() {
  const [estado, setEstado] = useState(null); // { available, linked, linked_at, bot_username }
  const [vinculo, setVinculo] = useState(null); // { code, url, expires_at } mientras espera
  const [ocupado, setOcupado] = useState(false);
  const [error, setError] = useState('');
  const temporizador = useRef(null), vivo = useRef(true);

  useEffect(() => {
    vivo.current = true;
    estadoTelegram().then((valor) => vivo.current && setEstado(valor)).catch((causa) => vivo.current && setError(causa.message));
    return () => { vivo.current = false; clearTimeout(temporizador.current); };
  }, []);

  // Mientras hay un código vigente, se consulta el estado cada 3 s hasta que el bot lo complete.
  function esperar(vence) {
    clearTimeout(temporizador.current);
    temporizador.current = setTimeout(async () => {
      if (!vivo.current) return;
      if (Date.now() > vence) { setVinculo(null); setError('El código venció. Genera otro.'); return; }
      try {
        const valor = await estadoTelegram();
        if (!vivo.current) return;
        if (valor.linked) { setEstado(valor); setVinculo(null); return; }
      } catch { /* se reintenta en el siguiente turno */ }
      esperar(vence);
    }, 3000);
  }

  async function conectar() {
    setOcupado(true); setError('');
    try {
      const nuevo = await vincularTelegram();
      setVinculo(nuevo);
      window.open(nuevo.url, '_blank', 'noopener,noreferrer');
      esperar(Date.parse(nuevo.expires_at) || Date.now() + 15 * 60000);
    } catch (causa) { setError(causa.message); } finally { setOcupado(false); }
  }

  async function desconectar() {
    setOcupado(true); setError('');
    try { await desvincularTelegram(); setEstado((old) => ({ ...old, linked: false, linked_at: null })); }
    catch (causa) { setError(causa.message); } finally { setOcupado(false); }
  }

  if (estado && !estado.available) return null;
  return <section className="mt-6 rounded-2xl border border-slate-200 bg-white p-5 shadow-soft" aria-label="Telegram">
    <h2 className="font-sans text-base font-extrabold tracking-tight text-slate-900">Telegram</h2>
    <p className="mb-3 font-body text-xs text-slate-500">Recibe en tu celular los resultados que pidas enviar a Telegram. Solo tu chat los recibe; puedes desconectarlo cuando quieras.</p>
    {!estado && !error && <p className="text-sm text-slate-500">Consultando…</p>}
    {estado?.linked && <div className="space-y-3">
      <p className="text-sm text-emerald-800">✅ Conectado{estado.linked_at ? ` desde el ${new Date(estado.linked_at).toLocaleDateString('es-CO')}` : ''} con @{estado.bot_username}.</p>
      <button type="button" disabled={ocupado} onClick={desconectar} className={`${BOTON} border border-slate-300`}>Desconectar Telegram</button>
    </div>}
    {estado && !estado.linked && !vinculo && <button type="button" disabled={ocupado} onClick={conectar} className={`${BOTON} bg-sky-600 text-white`}>Conectar Telegram</button>}
    {vinculo && <div className="space-y-2 rounded-xl bg-sky-50 p-3 text-sm text-sky-900" role="status">
      <p>Se abrió Telegram con @{vinculo.bot_username}. Toca <strong>Iniciar</strong> y vuelve aquí: esto se actualiza solo.</p>
      <p>¿No se abrió? <a className="font-semibold underline" href={vinculo.url} target="_blank" rel="noopener noreferrer">Abrir el bot</a> o escríbele este código: <span className="font-mono font-semibold">{vinculo.code}</span> (vence en 15 minutos).</p>
    </div>}
    {error && <p role="alert" className="mt-2 text-sm text-red-700">{error}</p>}
  </section>;
}
