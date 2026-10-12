// src/components/layout/AppLayout.jsx
import Navbar from './Navbar';

export default function AppLayout({
  children,
  usuario,
  seccionActiva,
  onCambiarSeccion,
  onCerrarSesion,
}) {
  return (
    <div className="min-h-screen bg-[#fcfdff] text-slate-800 flex flex-col">
      <Navbar
        usuario={usuario}
        seccionActiva={seccionActiva}
        onCambiarSeccion={onCambiarSeccion}
        onCerrarSesion={onCerrarSesion}
      />
      <main className="flex-1 w-full">{children}</main>
    </div>
  );
}