import { useState, useEffect, useRef } from "react";
import NetworkCanvas from "./components/NetworkCanvas";
import HeroSection from "./components/HeroSection";
import LoginForm from "./components/LoginForm";
import RegisterForm from "./components/RegisterForm";
import Toast from "./components/Toast";

export default function App() {
  const [mode, setMode] = useState(() => {
    return window.location.pathname.includes("registro") ? "registro" : "login";
  });

  const [toast, setToast] = useState({
    message: "",
    visible: false,
  });

  const toastTimerRef = useRef(null);

  const showToast = (message) => {
    if (toastTimerRef.current) {
      clearTimeout(toastTimerRef.current);
    }
    setToast({ message, visible: true });
    toastTimerRef.current = setTimeout(() => {
      setToast((prev) => ({ ...prev, visible: false }));
    }, 3500);
  };

  useEffect(() => {
    document.title =
      mode === "registro"
        ? "Registro de Usuario — Capacita"
        : "Iniciar Sesión — Capacita";
  }, [mode]);

  const switchMode = (newMode) => {
    setMode(newMode);
    const newUrl = newMode === "registro" ? "/registro" : "/";
    window.history.pushState({ vista: newMode }, "", newUrl);
  };

  useEffect(() => {
    const handlePopState = (e) => {
      if (e.state && e.state.vista) {
        setMode(e.state.vista);
      } else {
        setMode(window.location.pathname.includes("registro") ? "registro" : "login");
      }
    };
    window.addEventListener("popstate", handlePopState);
    return () => window.removeEventListener("popstate", handlePopState);
  }, []);

  return (
    <div className="min-h-full font-sans antialiased text-slate-800 bg-[#f8faff] overflow-x-hidden relative bg-gradient-to-br min-h-screen">
      {/* Fondo interactivo de nodos y partículas */}
      <NetworkCanvas />

      {/* Esferas difusas decorativas de fondo */}
      <div
        className="fixed top-12 left-10 w-[36rem] h-[36rem] rounded-full pointer-events-none z-0"
        style={{
          background:
            "radial-gradient(circle, rgba(219, 234, 254, 0.55) 0%, rgba(239, 246, 255, 0.3) 50%, transparent 70%)",
          filter: "blur(80px)",
        }}
      />
      <div
        className="fixed -bottom-16 left-1/4 w-[30rem] h-[30rem] rounded-full pointer-events-none z-0"
        style={{
          background:
            "radial-gradient(circle, rgba(207, 250, 254, 0.4) 0%, transparent 70%)",
          filter: "blur(75px)",
        }}
      />
      <div className="fixed top-0 right-0 w-1/2 h-full pointer-events-none z-0 overflow-hidden">
        <div
          className="absolute -top-16 -right-16 w-[36rem] h-[36rem] rounded-full"
          style={{
            background:
              "radial-gradient(circle, rgba(199, 210, 254, 0.45) 0%, rgba(224, 231, 255, 0.2) 45%, transparent 70%)",
            filter: "blur(70px)",
          }}
        />
        <div
          className="absolute bottom-10 right-10 w-[30rem] h-[30rem] rounded-full"
          style={{
            background:
              "radial-gradient(circle, rgba(186, 230, 253, 0.4) 0%, rgba(219, 234, 254, 0.25) 50%, transparent 70%)",
            filter: "blur(65px)",
          }}
        />
      </div>

      {/* Contenedor Principal */}
      <main className="relative z-10 min-h-screen w-full flex items-center justify-center p-4 sm:p-6 lg:p-8">
        <div className="w-full max-w-6xl xl:max-w-7xl mx-auto grid grid-cols-1 md:grid-cols-2 gap-6 lg:gap-10 xl:gap-14 items-center">
          {/* Sección Informativa (Hero) */}
          <HeroSection mode={mode} />

          {/* Tarjeta de Formulario (Login / Registro) */}
          <section className="flex items-center justify-center w-full py-2 lg:py-4">
            <div className="w-full max-w-md mx-auto vivid-login-pane rounded-3xl p-6 sm:p-7 lg:p-8 shadow-card relative">
              {/* Vista Login */}
              <div
                className={`panel-formulario-vista ${
                  mode === "login" ? "vista-activa" : "vista-oculta-izq"
                }`}
              >
                <LoginForm
                  onSwitchToRegister={() => switchMode("registro")}
                  showToast={showToast}
                />
              </div>

              {/* Vista Registro */}
              <div
                className={`panel-formulario-vista ${
                  mode === "registro" ? "vista-activa" : "vista-oculta-der"
                }`}
              >
                <RegisterForm
                  onSwitchToLogin={() => switchMode("login")}
                  showToast={showToast}
                />
              </div>
            </div>
          </section>
        </div>
      </main>

      {/* Componente Toast */}
      <Toast message={toast.message} isVisible={toast.visible} />
    </div>
  );
}
