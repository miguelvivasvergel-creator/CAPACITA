import Icono from './Icono';
export default function EncabezadoVista({icono,etiqueta='Tu espacio de trabajo',titulo,descripcion,children}) {
  return <header className="vista-encabezado"><div className="vista-encabezado-copy"><span className="vista-etiqueta"><Icono nombre={icono}/>{etiqueta}</span><h1>{titulo}</h1><p>{descripcion}</p></div>{children&&<div className="vista-acciones">{children}</div>}</header>;
}
