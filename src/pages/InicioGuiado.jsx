import ChatTaller from '../components/taller/ChatTaller';

// Inicio de la versión final: una sola pantalla de chat + taller.
// abrir: ['solucion', id] abre una solución guardada; ['usar', texto] deja escrito un pedido.
export default function InicioGuiado({ usuario, onCambiarSeccion, abrir = [] }) {
  return <ChatTaller key={`taller:${usuario?.id}`} usuario={usuario} onCambiarSeccion={onCambiarSeccion} abrir={abrir} />;
}
