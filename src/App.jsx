import { useState, useEffect, useCallback, useRef } from 'react';
import NetworkCanvas from './components/NetworkCanvas';
import HeroSection from './components/HeroSection';
import AuthCard from './components/AuthCard';
import Toast from './components/Toast';

export default function App() {
  const [modo, setModo] = useState('login');
  const [toastMsg, setToastMsg] = useState('');
  const [toastVisible, setToastVisible] = useState(false);
  const toastTimeoutRef = useRef(null);

  const mostrarToast = useCallback((msg) => {
    setToastMsg(msg);
    setToastVisible(true);
    if (toastTimeoutRef.current) clearTimeout(toastTimeoutRef.current);
    toastTimeoutRef.current = setTimeout(() => {
      setToastVisible(false);
    }, 3000);
  }, []);

  const handleCambiarModo = (nuevoModo) => {
    setModo(nuevoModo);
    const titulo = nuevoModo === 'registro' ? 'Registro — Capacita' : 'Iniciar Sesión — Capacita';
    document.title = titulo;
    window.history.pushState({ vista: nuevoModo }, '', nuevoModo === 'registro' ? '#registro' : '#login');
  };

  useEffect(() => {
    const handlePopState = (e) => {
      if (e.state && e.state.vista) {
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
    return () => window.removeEventListener('popstate', handlePopState);
  }, []);

  const handleGoogleClick = () => {
    mostrarToast('Iniciando conexión con Google...');
  };

  const handleLoginExitoso = (datos) => {
    mostrarToast(`¡Bienvenido de nuevo, ${datos.correo}!`);
  };

  const handleRegisterExitoso = (datos) => {
    mostrarToast(`¡Cuenta creada con éxito! Bienvenido, ${datos.fullname}.`);
    setTimeout(() => {
      handleCambiarModo('login');
    }, 1200);
  };

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
