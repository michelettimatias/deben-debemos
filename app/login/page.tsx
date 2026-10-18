import LoginForm from './login-form';

export const metadata = {
  title: 'Iniciar Sesión | Préstamos entre Tiendas',
  description: 'Acceso seguro al sistema de gestión de préstamos entre tiendas',
};

export default function LoginPage() {
  return (
    <div className="min-h-screen w-full flex items-center justify-center p-4 bg-gradient-to-br from-slate-50 via-slate-100 to-blue-50 relative overflow-hidden">
      {/* Decorative gradient blobs */}
      <div className="absolute top-[-10%] right-[-5%] w-[450px] h-[450px] rounded-full bg-blue-400/10 blur-3xl pointer-events-none" />
      <div className="absolute bottom-[-10%] left-[-5%] w-[450px] h-[450px] rounded-full bg-indigo-400/10 blur-3xl pointer-events-none" />

      <LoginForm />
    </div>
  );
}
