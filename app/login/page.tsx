import LoginForm from './login-form';

export const metadata = {
  title: 'Iniciar Sesión | Préstamos entre Tiendas',
  description: 'Acceso seguro al sistema de gestión de préstamos entre tiendas',
};

export default function LoginPage() {
  return (
    <div className="min-h-screen w-full flex items-center justify-center bg-gradient-to-br from-gray-100 to-slate-400 relative overflow-hidden">
      <LoginForm />
    </div>
  );
}
