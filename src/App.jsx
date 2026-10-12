import { useState, useEffect, useCallback, useRef } from 'react';
import NetworkCanvas from './components/NetworkCanvas';
import HeroSection from './components/HeroSection';
import AuthCard from './components/AuthCard';
import Toast from './components/Toast';
import AppLayout from './components/layout/AppLayout';
import Inicio from './pages/Inicio';
import Capacidades from './pages/Capacidades/Capacidades';
import Workflows from './pages/Workflows';
import Comunidad from './pages/Comunidad';
import {
  supabase,
  registrarUsuario,
  loginUsuario,
  loginConGoogle,
  obtenerUsuarioActual,
  cerrarSesion,
} from './services/supabase';

const SECCIONES_VALIDAS = ['inicio', 'capacidades', 'workflows', 'comunidad'];

export default function App() {
  const [modo, setModo] = useState(() =>
    window.location.hash === '#registro' ? 'registro' : 'login'
  );
  const [toastMsg, setToastMsg] = useState('');
  const [toastVisible, setToastVisible] = useState(false);
  const [usuarioActual, setUsuarioActual] = useState(null);
  const [cargandoSesion, setCargandoSesion] = useState(true);
  
  const initialHash = window.location.hash.replace('#', '');
  const [vista, setVista] = useState(
    SECCIONES_VALIDAS.includes(initialHash) ? initialHash : 'auth'
  );

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
    };
    document.title = titulos[seccion] || 'Capacita';
    window.history.pushState({ vista: seccion }, '', `#${seccion}`);
  };

  const handleIrAInicio = () => {
    handleCambiarSeccion('inicio');
  };

  const handleCerrarSesion = async () => {
    await cerrarSesion();
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
      if (SECCIONES_VALIDAS.includes(hash)) {
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
          setUsuarioActual(user);
          const hash = window.location.hash.replace('#', '');
          if (SECCIONES_VALIDAS.includes(hash)) {
            setVista(hash);
          } else {
            setVista('inicio');
            window.history.replaceState({ vista: 'inicio' }, '', '#inicio');
          }
        } else {
          const hash = window.location.hash.replace('#', '');
          if (SECCIONES_VALIDAS.includes(hash)) {
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
        const user = await obtenerUsuarioActual();
        if (user) {
          setUsuarioActual(user);
          setVista((prev) => (SECCIONES_VALIDAS.includes(prev) ? prev : 'inicio'));
        }
      } else if (event === 'SIGNED_OUT') {
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
  if (usuarioActual && SECCIONES_VALIDAS.includes(vista)) {
    return (
      <AppLayout
        usuario={usuarioActual}
        seccionActiva={vista}
        onCambiarSeccion={handleCambiarSeccion}
        onCerrarSesion={handleCerrarSesion}
      >
        {vista === 'inicio' && (
          <Inicio usuario={usuarioActual} onCambiarSeccion={handleCambiarSeccion} />
        )}
        {vista === 'capacidades' && <Capacidades />}
        {vista === 'workflows' && <Workflows _usuario={usuarioActual} />}
        {vista === 'comunidad' && <Comunidad _usuario={usuarioActual} />}
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
