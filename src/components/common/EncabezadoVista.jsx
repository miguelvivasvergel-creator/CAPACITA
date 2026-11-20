import Icono from './Icono';

// Última palabra del título con el degradado del login («Mis <herramientas>»).
function TituloConDegradado({ titulo }) {
  if (typeof titulo !== 'string' || !titulo.trim().includes(' ')) return <span className="vista-titulo-acento">{titulo}</span>;
  const corte = titulo.trimEnd().lastIndexOf(' ');
  return <>{titulo.slice(0, corte + 1)}<span className="vista-titulo-acento">{titulo.slice(corte + 1)}</span></>;
}

// Pequeña cadena de nodos decorativa, como las curvas punteadas del login.
function NodosDecorativos() {
  return <svg className="vista-encabezado-nodos" viewBox="0 0 160 64" fill="none" aria-hidden="true">
    <path d="M12 46 C 40 46, 52 16, 80 18 S 128 48, 148 40" stroke="url(#vista-nodos-grad)" strokeWidth="1.5" strokeDasharray="4 4" />
    <defs><linearGradient id="vista-nodos-grad" x1="0" x2="1"><stop offset="0" stopColor="#3b82f6" /><stop offset=".55" stopColor="#6366f1" /><stop offset="1" stopColor="#06b6d4" /></linearGradient></defs>
    <circle cx="12" cy="46" r="5" fill="#fff" stroke="#3b82f6" strokeWidth="2" /><circle cx="80" cy="18" r="6" fill="#fff" stroke="#6366f1" strokeWidth="2" /><circle cx="148" cy="40" r="5" fill="#fff" stroke="#06b6d4" strokeWidth="2" />
  </svg>;
}

export default function EncabezadoVista({icono,etiqueta='Tu espacio de trabajo',titulo,descripcion,children}) {
  return <header className="vista-encabezado">
    <div className="vista-encabezado-copy">
      <span className="vista-etiqueta"><span className="vista-etiqueta-icono"><Icono nombre={icono}/></span>{etiqueta}</span>
      <h1><TituloConDegradado titulo={titulo}/></h1>
      <p>{descripcion}</p>
    </div>
    {children ? <div className="vista-acciones">{children}</div> : <NodosDecorativos/>}
  </header>;
}
