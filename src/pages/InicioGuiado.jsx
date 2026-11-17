import ChatTaller from '../components/taller/ChatTaller';

// Inicio de la versión final: una sola pantalla de chat + taller.
export default function InicioGuiado({ usuario, onCambiarSeccion }) {
  return <ChatTaller key={`taller:${usuario?.id}`} usuario={usuario} onCambiarSeccion={onCambiarSeccion} />;
}
