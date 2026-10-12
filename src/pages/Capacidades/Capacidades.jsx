// src/pages/Capacidades/Capacidades.jsx
import { useState } from 'react';
import CapacidadesLayout from './CapacidadesLayout';
import MisCapacidades from './MisCapacidades';
import CrearCapacidad from './CrearCapacidad';
import { mockCapabilities } from '../../mocks/capabilities';

export default function Capacidades() {
  // Pestañas: 'mis' | 'comunidad' | 'crear'
  const [seccion, setSeccion] = useState('mis');

  // Por defecto el usuario no tiene capacidades creadas (array vacío)
  const [misCapacidades, setMisCapacidades] = useState([]);

  const handleGuardarCapacidad = (nuevaCapacidad) => {
    // Formatear la nueva capacidad para que coincida con la estructura de tarjetas
    const itemGuardado = {
      id: `cap-user-${Date.now()}`,
      name: nuevaCapacidad.nombre,
      version: 'v1.0.0',
      engine: nuevaCapacidad.adapterKey || 'Motor Custom',
      description: nuevaCapacidad.descripcion || 'Sin descripción',
      input_type: nuevaCapacidad.inputType,
      output_type: nuevaCapacidad.outputType,
      visibility: nuevaCapacidad.visibilidad || 'private',
      category: nuevaCapacidad.categoria || 'Texto',
      icon: 'document',
      uses_count: '0',
      owner_name: 'Yo',
      owner_username: 'mi_usuario',
    };

    // Al agregarla, misCapacidades ya no estará vacío y el frame vacío ya no volverá a aparecer
    setMisCapacidades((prev) => [itemGuardado, ...prev]);
    setSeccion('mis');
  };

  return (
    <CapacidadesLayout
      seccion={seccion}
      onCambiarSeccion={setSeccion}
      totalMis={misCapacidades.length}
      totalComunidad={mockCapabilities.length}
      onNuevaCapacidad={() => setSeccion('crear')}
    >
      {/* 1. Mis Capacidades (Muestra Frame 2 vacío si length === 0, o tarjetas si ya creó una) */}
      {seccion === 'mis' && (
        <MisCapacidades
          capacidades={misCapacidades}
          esMisCapacidades={true}
          onCrearClick={() => setSeccion('crear')}
        />
      )}

      {/* 2. Comunidad (Muestra el catálogo de 6 tarjetas con el filtro desplegable) */}
      {seccion === 'comunidad' && (
        <MisCapacidades
          capacidades={mockCapabilities}
          esMisCapacidades={false}
          onCrearClick={() => setSeccion('crear')}
        />
      )}

      {/* 3. Crear Nueva Capacidad */}
      {seccion === 'crear' && (
        <CrearCapacidad
          onCancelar={() => setSeccion('mis')}
          onGuardar={handleGuardarCapacidad}
        />
      )}
    </CapacidadesLayout>
  );
}