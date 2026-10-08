import { useState, useEffect, useCallback, useRef } from 'react';
import NetworkCanvas from './components/NetworkCanvas';
import HeroSection from './components/HeroSection';
import AuthCard from './components/AuthCard';
import Toast from './components/Toast';
import Capacidades from './pages/Capacidades/Capacidades';
import AppLayout from './components/layout/AppLayout';
import {
  registrarUsuario,
  loginUsuario,
  loginConGoogle,
  obtenerUsuarioActual,
} from './services/supabase';

export default function App() {
  const [modo, setModo] = useState('login');
  const [toastMsg, setToastMsg] = useState('');
  const [toastVisible, setToastVisible] = useState(false);
  const [usuarioActual, setUsuarioActual] = useState(null);
  const [vista, setVista] = useState(
    window.location.hash === '#capacidades' ? 'capacidades' : 'auth',
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

  const handleIrACapacidades = () => {
    setVista('capacidades');
    document.title = 'Capacidades — Capacita';
    window.history.pushState({ vista: 'capacidades' }, '', '#capacidades');
  };

  useEffect(() => {
    // 1. Manejo del historial del navegador
    const handlePopState = (e) => {
      if (window.location.hash === '#capacidades') {
        setVista('capacidades');
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

    if (window.location.hash === '#registro') {
      setModo('registro');
    }

    window.addEventListener('popstate', handlePopState);

    // 2. Verificar si ya hay una sesión activa de Supabase
    obtenerUsuarioActual().then((user) => {
      if (user) {
        setUsuarioActual(user);
      } else if (window.location.hash === '#capacidades') {
        setVista('auth');
        window.history.replaceState({ vista: 'login' }, '', '#login');
      }
    });

    return () => window.removeEventListener('popstate', handlePopState);
  }, []);

  const handleGoogleClick = async () => {
    mostrarToast('Redirigiendo a Google...');
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
      handleIrACapacidades();
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

  return (
    vista === 'capacidades' && usuarioActual ? (
  <AppLayout usuario={usuarioActual} seccionActiva="capacidades">
    <Capacidades />
  </AppLayout>
) :(
    vista === 'capacidades' && usuarioActual ? (
      <Capacidades />
    ) : (
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
    )
  )
);
}
