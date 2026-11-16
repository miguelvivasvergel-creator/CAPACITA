// src/components/layout/AppLayout.jsx
import Navbar from './Navbar';

export default function AppLayout({
  children,
  usuario,
  seccionActiva,
  onCambiarSeccion,
  onCerrarSesion,
  experiencia = 'desarrollador',
  onCambiarExperiencia,
}) {
  return (
    <div className="min-h-screen bg-[#fcfdff] text-slate-800 flex flex-col">
      <Navbar
        usuario={usuario}
        seccionActiva={seccionActiva}
        onCambiarSeccion={onCambiarSeccion}
        onCerrarSesion={onCerrarSesion}
        experiencia={experiencia}
      />
      {onCambiarExperiencia && <section aria-label="Modo de uso" className="border-b border-slate-200 bg-white px-4 py-3"><div className="mx-auto flex max-w-7xl flex-wrap items-center gap-2"><span className="mr-2 text-sm font-semibold text-slate-600">Modo de uso</span>{[['guiado','Guiado'],['desarrollador','Desarrollador']].map(([value,label])=><button key={value} type="button" aria-pressed={experiencia===value} onClick={()=>onCambiarExperiencia(value)} className={`min-h-11 rounded-xl border px-4 text-sm font-semibold focus-visible:outline-2 focus-visible:outline-blue-600 ${experiencia===value?'border-blue-700 bg-blue-700 text-white':'border-slate-300 text-slate-700'}`}>{label}</button>)}<p className="w-full text-xs text-slate-500">{experiencia==='guiado'?'Describe tu necesidad y revisa la solución. No necesitas programar.':'Herramientas avanzadas para revisar contratos, código, pruebas y procesos.'}</p></div></section>}
      <main className="flex-1 w-full">{children}</main>
    </div>
  );
}
