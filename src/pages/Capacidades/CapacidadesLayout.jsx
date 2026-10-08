// src/pages/Capacidades/CapacidadesLayout.jsx
import CapacidadesSubNav from '../../components/capabilities/CapacidadesSubNav'

export default function CapacidadesLayout({ seccion, onCambiarSeccion, children }) {
  return (
    <>
      <CapacidadesSubNav seccion={seccion} onCambiar={onCambiarSeccion} />
      <div className="px-6 py-6">{children}</div>
    </>
  )
}