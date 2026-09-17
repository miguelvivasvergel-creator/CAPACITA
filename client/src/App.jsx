import { useState, useEffect } from "react";
import NetworkCanvas from "./components/NetworkCanvas";
import HeroSection from "./components/HeroSection";
import LoginForm from "./components/LoginForm";
import RegisterForm from "./components/RegisterForm";
import MainPage from "./components/MainPage";
import Toast from "./components/Toast";

export default function App() {
  // 1. Estado del usuario autenticado (se recupera de localStorage si existe)
  const [user, setUser] = useState(() => {
    try {
      const saved = localStorage.getItem("capacita_user");
      if (!saved) return null;
      const parsed = JSON.parse(saved);
      // Limpiar datos antiguos estáticos
      if (parsed?.name === "Miguel Vivas" && parsed?.email === "miguel@gmail.com") {
        localStorage.removeItem("capacita_user");
        return null;
      }
      return parsed;
    } catch {
      return null;
    }
  });

  // 2. Modo actual de la vista: 'login', 'registro' o 'dashboard'
  const [mode, setMode] = useState(() => {
    const saved = localStorage.getItem("capacita_user");
    if (saved) return "dashboard";
    return window.location.pathname.includes("registro") ? "registro" : "login";
  });

  // 3. Guarda el usuario recién registrado para rellenar sus datos en el login
  const [registeredUser, setRegisteredUser] = useState(null);

  // 4. Estado de notificaciones flotantes (Toast)
  const [toast, setToast] = useState({ message: "", visible: false });

  const showToast = (message) => {
    setToast({ message, visible: true });
    setTimeout(() => {
      setToast({ message: "", visible: false });
    }, 3000);
  };

  // Función para cambiar de vista y actualizar la URL
  const switchMode = (newMode) => {
    setMode(newMode);
    const newUrl = newMode === "dashboard" ? "/dashboard" : newMode === "registro" ? "/registro" : "/";
    window.history.pushState({ vista: newMode }, "", newUrl);
  };

  // Inicio de sesión exitoso
  const handleLoginSuccess = (userData) => {
    const newUser = {
      name: userData?.name || "Usuario",
      email: userData?.email || "",
      avatar: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=150&h=150&q=80",
    };
    setUser(newUser);
    localStorage.setItem("capacita_user", JSON.stringify(newUser));
    switchMode("dashboard");
  };

  // Cerrar sesión
  const handleLogout = () => {
    setUser(null);
    localStorage.removeItem("capacita_user");
    switchMode("login");
  };

  // Si el usuario está autenticado, mostrar el Panel Principal (Dashboard)
  if (mode === "dashboard" && user) {
    return (
      <>
        <MainPage user={user} onLogout={handleLogout} showToast={showToast} />
        <Toast message={toast.message} isVisible={toast.visible} />
      </>
    );
  }

  // Si no está autenticado, mostrar la pantalla de Login / Registro
  return (
    <div className="min-h-screen bg-[#f8faff] flex items-center justify-center p-4 relative overflow-hidden font-sans">
      <NetworkCanvas />

      <main className="relative z-10 w-full max-w-5xl grid grid-cols-1 md:grid-cols-2 gap-8 items-center">
        {/* Sección izquierda: Hero */}
        <HeroSection mode={mode} />

        {/* Sección derecha: Formulario Login / Registro */}
        <section className="bg-white/95 backdrop-blur-md rounded-3xl p-6 sm:p-8 shadow-xl border border-slate-100 max-w-md mx-auto w-full">
          {mode === "login" ? (
            <LoginForm
              onSwitchToRegister={() => switchMode("registro")}
              showToast={showToast}
              onLoginSuccess={handleLoginSuccess}
              registeredUser={registeredUser}
            />
          ) : (
            <RegisterForm
              onSwitchToLogin={(regData) => {
                if (regData) setRegisteredUser(regData);
                switchMode("login");
              }}
              onRegisterSuccess={handleLoginSuccess}
              showToast={showToast}
            />
          )}
        </section>
      </main>

      <Toast message={toast.message} isVisible={toast.visible} />
    </div>
  );
}
