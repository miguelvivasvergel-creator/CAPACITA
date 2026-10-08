// src/components/layout/AppLayout.jsx
import Navbar from './Navbar';

export default function AppLayout({ children, usuario, seccionActiva, onCambiarSeccion }) {
  return (
    <div className="min-h-screen bg-slate-50">
      <Navbar
        usuario={usuario}
        seccionActiva={seccionActiva}
        onCambiarSeccion={onCambiarSeccion}
      />
      <main>{children}</main>
    </div>
  );
}