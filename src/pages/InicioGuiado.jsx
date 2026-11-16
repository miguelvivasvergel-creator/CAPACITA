import AsistenteGuiado from '../components/capabilities/AsistenteGuiado';
import ResumenTrabajo from '../components/profile/ResumenTrabajo';

export default function InicioGuiado({usuario,onCambiarSeccion}){
  return <div className="mx-auto max-w-6xl space-y-8 px-4 py-10 sm:px-6"><header className="mx-auto max-w-3xl text-center"><p className="text-sm text-slate-500">Hola, {usuario?.name||'bienvenido'}</p><h1 className="mt-3 text-4xl font-extrabold tracking-tight sm:text-5xl">¿Qué necesitas resolver?</h1><p className="mt-4 text-slate-600">Capacita busca herramientas, prepara una propuesta y te guía hasta el resultado. Tú revisas los pasos y decides cuándo ejecutar.</p></header><AsistenteGuiado key={`asistente:${usuario?.id}`} usuario={usuario} onCambiarSeccion={onCambiarSeccion}/><ResumenTrabajo key={`resumen:${usuario?.id}`} experiencia="guiado" onCambiarSeccion={onCambiarSeccion}/></div>;
}
