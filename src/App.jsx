import { useState, useEffect, useCallback, useRef } from 'react';
import NetworkCanvas from './components/landing/NetworkCanvas';
import HeroSection from './components/landing/HeroSection';
import AuthCard from './components/auth/AuthCard';
import Toast from './components/common/Toast';
import AppLayout from './components/layout/AppLayout';
import Inicio from './pages/Inicio';
import InicioGuiado from './pages/InicioGuiado';
import SolucionesGuiadas from './pages/SolucionesGuiadas';
import ResultadosGuiados from './pages/ResultadosGuiados';
import BibliotecaGuiada from './pages/BibliotecaGuiada';
import { leerExperiencia, guardarExperiencia } from './utils/experiencia';
import Capacidades from './pages/Capacidades/Capacidades';
import Workflows from './pages/Workflows';
import Historial from './pages/Historial';
import Comunidad from './pages/Comunidad';
import Configuracion from './pages/Configuracion';
import Perfil from './pages/Perfil';
import TrabajoCapacidad from './pages/TrabajoCapacidad';
import Buscar from './pages/Buscar';
import { limpiarObjetivosPlan } from './utils/plannerDraft';
import {
  supabase,
  registrarUsuario,
  loginUsuario,
  loginConGoogle,
  obtenerUsuarioActual,
  cerrarSesion,
} from './services/supabase';

const SECCIONES_VALIDAS = [
  'inicio',
  'capacidades',
  'workflows',
  'historial',
  'comunidad',
  'configuracion',
  'perfil',
  'ejecutar',
  'buscar',
];

// La sección es la primera parte del hash: '#perfil/fahida' → 'perfil', '#ejecutar/workflow/wf-001' → 'ejecutar'
const esSeccionValida = (hash) => SECCIONES_VALIDAS.includes(hash.split('/')[0]);
const decodificarParametro = (value = '') => { try { return decodeURIComponent(value); } catch { return ''; } };

export default function App() {
  const [modo, setModo] = useState(() =>
    window.location.hash === '#registro' ? 'registro' : 'login'
  );
  const [toastMsg, setToastMsg] = useState('');
  const [toastVisible, setToastVisible] = useState(false);
  const [usuarioActual, setUsuarioActual] = useState(null);
  const [experienciaElegida, setExperienciaElegida] = useState(null);
  const experiencia = experienciaElegida && experienciaElegida.userId === usuarioActual?.id ? experienciaElegida.value : leerExperiencia(usuarioActual?.id);
  const [cargandoSesion, setCargandoSesion] = useState(true);
  // Chat guiado: sigue montado (oculto) al visitar otras secciones para no perder la
  // conversación ni cortar una herramienta a medio crear. Solo se reinicia al abrir algo
  // concreto (herramienta, solución, pedido) o al cambiar de cuenta.
  const [chatGuiado, setChatGuiado] = useState({ clave: null, abrir: [], usuario: null, vista: null, abiertos: 0 });

  const initialHash = window.location.hash.replace('#', '');
  const [vista, setVista] = useState(
    esSeccionValida(initialHash) ? initialHash : 'auth'
  );

  useEffect(() => {
    const titles = { inicio: 'Inicio', capacidades: experiencia === 'guiado' ? 'Mi biblioteca' : 'Capacidades', workflows: experiencia === 'guiado' ? 'Mi biblioteca' : 'Workflows', historial: experiencia === 'guiado' ? 'Mis resultados' : 'Mis ejecuciones',
      comunidad: 'Comunidad', configuracion: 'Configuración', perfil: 'Perfil',
      ejecutar: 'Capacidad', buscar: 'Buscar' };
    const title = titles[vista.split('/')[0]];
    if (usuarioActual && title) document.title = `${title} — Capacita`;
  }, [vista, usuarioActual, experiencia]);

  const toastTimeoutRef = useRef(null);

  const mostrarToast = useCallback((msg) => {
    setToastMsg(msg);
    setToastVisible(true);
    if (toastTimeoutRef.current) clearTimeout(toastTimeoutRef.current);
    toastTimeoutRef.current = setTimeout(() => {
      setToastVisible(false);
    }, 3500);
  }, []);

  const handleCambiarModo = (nuevoModo) => {
    setVista('auth');
    setModo(nuevoModo);
    const titulo = nuevoModo === 'registro' ? 'Registro — Capacita' : 'Iniciar Sesión — Capacita';
    document.title = titulo;
    window.history.pushState({ vista: nuevoModo }, '', nuevoModo === 'registro' ? '#registro' : '#login');
  };

  const handleCambiarSeccion = (seccion) => {
    setVista(seccion);
    const titulos = {
      inicio: 'Inicio — Capacita',
      capacidades: 'Capacidades — Capacita',
      workflows: 'Workflows — Capacita',
      comunidad: 'Comunidad — Capacita',
      configuracion: 'Configuración — Capacita',
      perfil: 'Perfil — Capacita',
      ejecutar: 'Ejecutar — Capacita',
      buscar: 'Buscar — Capacita',
    };
    document.title = titulos[seccion.split('/')[0]] || 'Capacita';
    window.history.pushState({ vista: seccion }, '', `#${seccion}`);
  };

  const handleIrAInicio = () => {
    handleCambiarSeccion('inicio');
  };

  const handleCerrarSesion = async () => {
    await cerrarSesion();
    limpiarObjetivosPlan();
    setUsuarioActual(null);
    setVista('auth');
    setModo('login');
    document.title = 'Iniciar Sesión — Capacita';
    window.history.pushState({ vista: 'login' }, '', '#login');
    mostrarToast('Sesión cerrada con éxito.');
  };

  useEffect(() => {
    // 1. Manejo del historial del navegador
    const handlePopState = (e) => {
      const hash = window.location.hash.replace('#', '');
      if (esSeccionValida(hash)) {
        setVista(hash);
      } else {
        setVista('auth');
      }

      if (e.state && (e.state.vista === 'login' || e.state.vista === 'registro')) {
        setModo(e.state.vista);
      } else if (window.location.hash === '#registro') {
        setModo('registro');
      } else {
        setModo('login');
      }
    };

    window.addEventListener('popstate', handlePopState);

    // 2. Comprobar sesión activa de Supabase
    obtenerUsuarioActual()
      .then((user) => {
        if (user) {
          limpiarObjetivosPlan(user.id);
          setUsuarioActual(user);
          const hash = window.location.hash.replace('#', '');
          if (esSeccionValida(hash)) {
            setVista(hash);
          } else {
            setVista('inicio');
            window.history.replaceState({ vista: 'inicio' }, '', '#inicio');
          }
        } else {
          limpiarObjetivosPlan();
          const hash = window.location.hash.replace('#', '');
          if (esSeccionValida(hash)) {
            setVista('auth');
            window.history.replaceState({ vista: 'login' }, '', '#login');
          }
        }
      })
      .finally(() => {
        setCargandoSesion(false);
      });

    // 3. Suscripción en tiempo real a cambios de sesión (Google OAuth, refresh de token, logout)
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (event === 'SIGNED_IN' && session?.user) {
        limpiarObjetivosPlan(session.user.id);
        const user = await obtenerUsuarioActual();
        if (user) {
          setUsuarioActual(user);
          setVista((prev) => (esSeccionValida(prev) ? prev : 'inicio'));
        }
      } else if (event === 'SIGNED_OUT') {
        limpiarObjetivosPlan();
        setUsuarioActual(null);
        setVista('auth');
      }
    });

    return () => {
      window.removeEventListener('popstate', handlePopState);
      subscription?.unsubscribe();
    };
  }, []);

  const handleGoogleClick = async () => {
    mostrarToast('Conectando con Google...');
    const result = await loginConGoogle();
    if (!result.success) {
      mostrarToast(`Error: ${result.error}`);
    }
  };

  const handleLoginExitoso = async ({ correo, contrasena }) => {
    const result = await loginUsuario({ email: correo, password: contrasena });
    if (result.success) {
      setUsuarioActual(result.data);
      mostrarToast(`¡Bienvenido de nuevo, ${result.data.name}!`);
      handleIrAInicio();
      return true;
    } else {
      mostrarToast(`Error: ${result.error}`);
      return false;
    }
  };

  const handleRegisterExitoso = async ({ fullname, email, password }) => {
    const result = await registrarUsuario({
      nombre: fullname,
      email: email,
      password: password,
    });

    if (result.success) {
      mostrarToast(`¡Cuenta creada con éxito! Bienvenido, ${fullname}.`);
      setTimeout(() => {
        handleCambiarModo('login');
      }, 1500);
      return true;
    } else {
      mostrarToast(`Error: ${result.error}`);
      return false;
    }
  };

  // Pantalla de carga inicial mientras se comprueba la sesión
  if (cargandoSesion) {
    return (
      <div className="min-h-screen bg-[#f8faff] flex flex-col items-center justify-center">
        <div className="w-12 h-12 rounded-2xl bg-[#1a56db] flex items-center justify-center shadow-lg shadow-blue-500/25 animate-pulse mb-4">
          <svg className="w-6 h-6 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
            <rect x="3" y="4" width="7" height="7" rx="1.5" />
            <rect x="14" y="13" width="7" height="7" rx="1.5" />
            <path d="M7 11v4a2 2 0 0 0 2 2h5" />
          </svg>
        </div>
        <div className="flex items-center gap-2 text-slate-500 text-sm font-medium">
          <svg className="animate-spin h-4 w-4 text-[#1a56db]" viewBox="0 0 24 24" fill="none">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z"></path>
          </svg>
          <span>Cargando Capacita...</span>
        </div>
      </div>
    );
  }

  // Si está autenticado y en una sección de la app
  if (usuarioActual && esSeccionValida(vista)) {
    // '#perfil/fahida' → seccion = 'perfil', parametros = ['fahida']
    const [seccion, ...parametros] = vista.split('/');
    // Estado derivado de la navegación (se ajusta durante el render, patrón admitido por React).
    let chat = chatGuiado;
    // Otra cuenta o fuera del modo guiado: el chat anterior no se retoma.
    if (chat.usuario !== usuarioActual.id || (experiencia !== 'guiado' && chat.clave)) chat = { ...chat, clave: null, abrir: [], usuario: usuarioActual.id };
    if (vista !== chat.vista) {
      // Cada navegación a «inicio/…» con algo que abrir crea un chat nuevo (aunque sea la misma
      // herramienta otra vez); volver a «inicio» a secas retoma la conversación que había.
      const nuevo = experiencia === 'guiado' && seccion === 'inicio' && (parametros.length > 0 || !chat.clave);
      chat = { ...chat, vista, ...(nuevo ? { abiertos: chat.abiertos + 1, clave: `${usuarioActual.id}:guiado:${chat.abiertos + 1}`, abrir: parametros } : {}) };
    }
    if (chat !== chatGuiado) setChatGuiado(chat);

    return (
      <AppLayout
        usuario={usuarioActual}
        seccionActiva={seccion}
        onCambiarSeccion={handleCambiarSeccion}
        onCerrarSesion={handleCerrarSesion}
        experiencia={experiencia}
        onCambiarExperiencia={(value) => {
          if (value === experiencia) return;
          if (document.querySelector('[data-task-busy="true"]')) { mostrarToast('Espera a que termine la operación antes de cambiar de modo.'); return; }
          const event = new Event('beforeunload', {cancelable:true});
          if (!window.dispatchEvent(event) && !window.confirm('Hay trabajo en esta pantalla que podrías perder al cambiar de modo. ¿Quieres continuar?')) return;
          guardarExperiencia(usuarioActual.id,value);
          setExperienciaElegida({userId:usuarioActual.id,value});
        }}
      >
        {experiencia === 'guiado' && chat.clave && <div style={{ display: seccion === 'inicio' ? 'contents' : 'none' }}>
          <InicioGuiado key={chat.clave} abrir={chat.abrir} usuario={usuarioActual} onCambiarSeccion={handleCambiarSeccion}/>
        </div>}
        {seccion === 'inicio' && experiencia !== 'guiado' && (
          <Inicio key={`${usuarioActual.id}:${parametros[0] || 'inicio'}`} initialMode={parametros[0]} usuario={usuarioActual} onCambiarSeccion={handleCambiarSeccion} />
        )}
        {/* Modo guiado: herramientas y soluciones viven juntas en «Mi biblioteca»; el detalle de una
            solución guardada (#workflows/<id>) sigue abriendo su propia vista. */}
        {seccion === 'capacidades' && (experiencia === 'guiado' ? <BibliotecaGuiada key={usuarioActual.id} onCambiarSeccion={handleCambiarSeccion}/> : <Capacidades onAbrirCapacidad={(capacidad) => handleCambiarSeccion(`ejecutar/capability/${capacidad.id}`)} />)}
        {seccion === 'workflows' && (experiencia === 'guiado'
          ? (parametros[0] ? <SolucionesGuiadas key={`${usuarioActual.id}:${vista}`} workflowId={parametros[0]} onCambiarSeccion={handleCambiarSeccion}/> : <BibliotecaGuiada key={`${usuarioActual.id}:combinadas`} filtroInicial="combinadas" onCambiarSeccion={handleCambiarSeccion}/>)
          : <Workflows key={`${usuarioActual.id}:${vista}`} workflowId={parametros[0]} _usuario={usuarioActual} />)}
        {seccion === 'historial' && (experiencia === 'guiado' ? <ResultadosGuiados key={`${usuarioActual.id}:${vista}`} runId={parametros[0]} onCambiarSeccion={handleCambiarSeccion}/> : <Historial key={`${usuarioActual.id}:${vista}`} runId={parametros[0]} onCambiarSeccion={handleCambiarSeccion} />)}
        {seccion === 'comunidad' && <Comunidad key={usuarioActual.id} experiencia={experiencia} _usuario={usuarioActual} onCambiarSeccion={handleCambiarSeccion} />}
        {seccion === 'configuracion' && (
          <Configuracion key={usuarioActual?.id} usuario={usuarioActual} onCerrarSesion={handleCerrarSesion} />
        )}
        {seccion === 'perfil' && (
          <Perfil
            key={parametros[0]}
            usuario={usuarioActual}
            experiencia={experiencia}
            username={decodificarParametro(parametros[0]) || usuarioActual.username}
            onCambiarSeccion={handleCambiarSeccion}
            onConfigurar={() => handleCambiarSeccion('configuracion')}
            onPerfilActualizado={(perfil) => setUsuarioActual((previous) => previous?.id === perfil.id
              ? { ...previous, name: perfil.display_name, avatar_url: perfil.avatar_url }
              : previous)}
          />
        )}
        {seccion === 'ejecutar' && (
          parametros[0] === 'workflow'
            ? experiencia === 'guiado' ? <SolucionesGuiadas key={`${usuarioActual.id}:${vista}`} workflowId={parametros[1]} onCambiarSeccion={handleCambiarSeccion}/> : <Workflows key={`${usuarioActual.id}:${vista}`} workflowId={parametros[1]} _usuario={usuarioActual} />
            : <TrabajoCapacidad key={`${usuarioActual.id}:${experiencia}:${vista}`} id={parametros[1]} usuario={usuarioActual} experiencia={experiencia} onCambiarSeccion={handleCambiarSeccion} />
        )}
        {seccion === 'buscar' && (
          <Buscar
            key={vista}
            texto={decodificarParametro(parametros[0])}
            capacidadId={parametros[1]}
            metodo={parametros[2]}
            alcance={parametros[3]}
            categoria={decodificarParametro(parametros[4])}
            autor={decodificarParametro(parametros[5])}
            tipoDato={parametros[6] || ''}
            experiencia={experiencia}
            usuario={usuarioActual}
            onCambiarSeccion={handleCambiarSeccion}
          />
        )}
        <Toast mensaje={toastMsg} visible={toastVisible} />
      </AppLayout>
    );
  }

  // Vista de autenticación (Login / Registro)
  return (
    <div className="relative min-h-screen w-full overflow-x-hidden">
      <NetworkCanvas />

      <div
        className="fixed top-12 left-10 w-[36rem] h-[36rem] rounded-full pointer-events-none z-0"
        style={{
          background: 'radial-gradient(circle, rgba(219, 234, 254, 0.55) 0%, rgba(239, 246, 255, 0.3) 50%, transparent 70%)',
          filter: 'blur(80px)',
        }}
      />
      <div
        className="fixed -bottom-16 left-1/4 w-[30rem] h-[30rem] rounded-full pointer-events-none z-0"
        style={{
          background: 'radial-gradient(circle, rgba(207, 250, 254, 0.4) 0%, transparent 70%)',
          filter: 'blur(75px)',
        }}
      />
      <div className="fixed top-0 right-0 w-1/2 h-full pointer-events-none z-0 overflow-hidden">
        <div
          className="absolute -top-16 -right-16 w-[36rem] h-[36rem] rounded-full"
          style={{
            background: 'radial-gradient(circle, rgba(199, 210, 254, 0.45) 0%, rgba(224, 231, 255, 0.2) 45%, transparent 70%)',
            filter: 'blur(70px)',
          }}
        />
        <div
          className="absolute bottom-10 right-10 w-[30rem] h-[30rem] rounded-full"
          style={{
            background: 'radial-gradient(circle, rgba(186, 230, 253, 0.4) 0%, rgba(219, 234, 254, 0.25) 50%, transparent 70%)',
            filter: 'blur(65px)',
          }}
        />
      </div>

      <main className="relative z-10 min-h-screen w-full flex items-center justify-center p-4 sm:p-6 lg:p-8">
        <div className="w-full max-w-6xl xl:max-w-7xl mx-auto grid grid-cols-1 md:grid-cols-2 gap-6 lg:gap-10 xl:gap-14 items-center">
          <HeroSection modo={modo} />
          <AuthCard
            modo={modo}
            setModo={handleCambiarModo}
            onGoogleClick={handleGoogleClick}
            onLoginExitoso={handleLoginExitoso}
            onRegisterExitoso={handleRegisterExitoso}
          />
        </div>
      </main>

      <Toast mensaje={toastMsg} visible={toastVisible} />
    </div>
  );
}
