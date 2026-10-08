// src/components/capacidades/CapacidadesSubNav.jsx
const secciones = [
  { id: 'mis', label: 'Mis capacidades' },
  { id: 'crear', label: 'Crear capacidad' },
]

export default function CapacidadesSubNav({ seccion, onCambiar }) {
  return (
    <nav className="sticky top-16 z-10 flex gap-6 border-b bg-white px-6 py-3">
      {secciones.map(({ id, label }) => (
        <button
          key={id}
          onClick={() => onCambiar(id)}
          className={
            seccion === id
              ? 'font-semibold text-blue-600 border-b-2 border-blue-600 pb-1'
              : 'text-slate-600 hover:text-slate-900 pb-1'
          }
        >
          {label}
        </button>
      ))}
    </nav>
  )
}