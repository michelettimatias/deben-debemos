import Link from 'next/link';

export default function NotFound() {
  return (
    <div className="min-h-screen w-full flex flex-col items-center justify-center p-4 bg-slate-50 text-slate-800">
      <h2 className="text-4xl font-extrabold text-slate-900 mb-2">404</h2>
      <p className="text-slate-600 mb-6">Página no encontrada</p>
      <Link
        href="/dashboard"
        className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-xl transition text-sm shadow-sm"
      >
        Volver al inicio
      </Link>
    </div>
  );
}
