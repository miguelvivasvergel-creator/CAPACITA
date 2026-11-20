import { useState, useRef, useEffect } from 'react';
import Icono from '../common/Icono';
import Marca from '../common/Marca';

export default function Navbar({usuario,seccionActiva='inicio',onCambiarSeccion,onCerrarSesion,experiencia='desarrollador'}) {
  const [menuAbierto,setMenuAbierto]=useState(false);
  const [failedAvatar,setFailedAvatar]=useState(null);
  const menuRef=useRef(null);
  const nombre=usuario?.name||'Usuario';
  const iniciales=nombre.split(' ').filter(Boolean).slice(0,2).map(part=>part[0]).join('').toUpperCase();
  const guiado=experiencia==='guiado';
  // Modo guiado: herramientas y soluciones viven juntas en «Mi biblioteca».
  const links=guiado
    ?[{id:'inicio',nombre:'Chat',icono:'chat'},{id:'capacidades',nombre:'Mi biblioteca',icono:'herramientas'},{id:'historial',nombre:'Resultados',icono:'resultados'},{id:'comunidad',nombre:'Comunidad',icono:'comunidad'}]
    :[{id:'inicio',nombre:'Inicio',icono:'inicio'},{id:'capacidades',nombre:'Capacidades',icono:'herramientas'},{id:'workflows',nombre:'Workflows',icono:'soluciones'},{id:'historial',nombre:'Mis ejecuciones',icono:'resultados'},{id:'comunidad',nombre:'Comunidad',icono:'comunidad'}];
  const base=seccionActiva.split('/')[0];
  const activa=guiado&&base==='workflows'?'capacidades':base;
  useEffect(()=>{
    function outside(event){if(!menuRef.current?.contains(event.target))setMenuAbierto(false);}
    function escape(event){if(event.key==='Escape'&&menuRef.current?.contains(document.activeElement)){setMenuAbierto(false);menuRef.current.querySelector('[aria-expanded]')?.focus();}}
    document.addEventListener('mousedown',outside);document.addEventListener('keydown',escape);
    return()=>{document.removeEventListener('mousedown',outside);document.removeEventListener('keydown',escape);};
  },[]);
  function go(section){setMenuAbierto(false);onCambiarSeccion?.(section);}
  return <aside className="workspace-nav" aria-label="Navegación de Capacita">
    <div className="nav-marca-row"><button type="button" className="nav-marca" title="Ir a Inicio" onClick={()=>go('inicio')}><Marca/></button><button type="button" className="nav-buscar-movil" aria-label="Buscar" onClick={()=>go('buscar')}><Icono nombre="buscar"/></button></div>
    <button type="button" className="nav-nuevo" aria-label="Crear" title="Describir una necesidad nueva" onClick={()=>go(experiencia==='guiado'?'inicio':'workflows')}><Icono nombre="mas"/><span>{experiencia==='guiado'?'Nueva necesidad':'Crear'}</span><Icono nombre="flecha" className="ml-auto h-4 w-4"/></button>
    <p className="nav-grupo">ESPACIO DE TRABAJO</p>
    <nav className="nav-enlaces" aria-label="Principal">{links.map(link=><button type="button" key={link.id} aria-current={activa===link.id?'page':undefined} onClick={()=>go(link.id)} className={`nav-enlace ${activa===link.id?'is-active':''}`}><Icono nombre={link.icono}/><span>{link.nombre}</span></button>)}</nav>
    <div className="nav-explorar"><p className="nav-grupo">DESCUBRIR</p><button type="button" className={`nav-enlace ${seccionActiva==='buscar'?'is-active':''}`} onClick={()=>go('buscar')}><Icono nombre="buscar"/><span>Buscar</span></button></div>
    <div className="nav-pie"><div className="nav-cuenta" ref={menuRef}>
      <button type="button" aria-label="Menú de usuario" aria-expanded={menuAbierto} onClick={()=>setMenuAbierto(value=>!value)} className="nav-cuenta-trigger">{usuario?.avatar_url&&failedAvatar!==usuario.avatar_url?<img src={usuario.avatar_url} width="36" height="36" alt="" onError={()=>setFailedAvatar(usuario.avatar_url)}/>:<span className="nav-avatar">{iniciales}</span>}<span className="nav-cuenta-nombre"><strong>{nombre}</strong><span>Mi cuenta</span></span><Icono nombre="chevron" className="nav-cuenta-chevron h-4 w-4"/></button>
      {menuAbierto&&<div className="nav-cuenta-menu"><p className="truncate text-sm font-semibold">{nombre}</p><p className="mb-3 truncate text-xs text-slate-500">{usuario?.email}</p>{[['perfil','Mi perfil',`perfil/${usuario?.username}`],['ajustes','Configuración','configuracion']].map(([icono,label,section])=><button type="button" key={section} onClick={()=>go(section)}><Icono nombre={icono}/>{label}</button>)}<button type="button" className="text-red-600" onClick={()=>{setMenuAbierto(false);onCerrarSesion?.();}}><Icono nombre="salir"/>Cerrar sesión</button></div>}
    </div><p className="nav-firma">Conecta capacidades. Resuelve objetivos.</p></div>
  </aside>;
}
