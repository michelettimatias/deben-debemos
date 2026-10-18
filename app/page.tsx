import Link from "next/link";

export default function Home() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-6 bg-gradient-to-br from-slate-50 via-slate-100 to-blue-50 text-center">
      <div className="max-w-xl w-full p-8 bg-white/80 backdrop-blur-md rounded-3xl border border-slate-200/80 shadow-xl">
        <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-tr from-blue-600 to-indigo-600 text-white shadow-lg shadow-blue-500/25 mb-6">
          <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
          </svg>
        </div>
        <h1 className="text-3xl font-extrabold tracking-tight text-slate-900 mb-3">
          Préstamos entre Tiendas
        </h1>
        <p className="text-slate-600 mb-8 leading-relaxed text-sm sm:text-base">
          Plataforma para coordinar, registrar y confirmar la transferencia y préstamo de inventario entre distintas sucursales.
        </p>
        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <Link
            href="/login"
            className="px-6 py-3 bg-gradient-to-r from-blue-600 to-indigo-600 text-white font-medium rounded-xl hover:from-blue-700 hover:to-indigo-700 transition shadow-md shadow-blue-500/20"
          >
            Iniciar Sesión
          </Link>
          <Link
            href="/dashboard"
            className="px-6 py-3 bg-white text-slate-700 font-medium rounded-xl border border-slate-200 hover:bg-slate-50 transition shadow-sm"
          >
            Ir al Dashboard
          </Link>
        </div>
      </div>
    </main>
  );
}
