// src/pages/Capacidades/Capacidades.jsx
import { useState } from 'react'
import CapacidadesLayout from './CapacidadesLayout'
import MisCapacidades from './MisCapacidades'
import CrearCapacidad from './CrearCapacidad'

export default function Capacidades() {
  const [seccion, setSeccion] = useState('mis')

  return (
    <div>
      <div>
        Capacidades
      </div>
      <br />
      <br />
      <CapacidadesLayout seccion={seccion} onCambiarSeccion={setSeccion}>
        {seccion === 'mis' && <MisCapacidades />}
        {seccion === 'crear' && <CrearCapacidad />}
      </CapacidadesLayout>
    </div>
  )
}