import LoginForm from './LoginForm';
import RegisterForm from './RegisterForm';

export default function AuthCard({
  modo,
  setModo,
  onGoogleClick,
  onLoginExitoso,
  onRegisterExitoso,
}) {
  return (
    <section className="flex items-center justify-center w-full py-2 lg:py-4">
      <div className="w-full max-w-md mx-auto vivid-login-pane rounded-3xl p-6 sm:p-7 lg:p-8 shadow-card">
        <div
          className={`panel-formulario-vista ${
            modo === 'login' ? 'vista-activa' : 'vista-oculta-izq'
          }`}
        >
          <LoginForm
            onIrRegistro={() => setModo('registro')}
            onGoogleClick={onGoogleClick}
            onLoginExitoso={onLoginExitoso}
          />
        </div>

        <div
          className={`panel-formulario-vista ${
            modo === 'registro' ? 'vista-activa' : 'vista-oculta-der'
          }`}
        >
          <RegisterForm
            onIrLogin={() => setModo('login')}
            onGoogleClick={onGoogleClick}
            onRegisterExitoso={onRegisterExitoso}
          />
        </div>
      </div>
    </section>
  );
}
