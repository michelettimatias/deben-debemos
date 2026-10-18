import Link from 'next/link';
import { createClient } from '@/utils/supabase/server';
import { signout } from '@/login/actions';
import StorePerspectiveSelector from './StorePerspectiveSelector';

export default async function DashboardHeader({ title }: { title: string }) {
	const supabase = await createClient();
	const {
		data: { user },
	} = await supabase.auth.getUser();

	const { data: profile } = await supabase
		.from('profiles')
		.select('*, store:stores(name)')
		.eq('id', user?.id ?? '')
		.maybeSingle();

	const isSuperUser = user?.email === 'michelettimatias@gmail.com' || profile?.role === 'admin';

	let stores: { id: number; name: string }[] = [];
	let defaultStoreId: number | null = null;

	if (isSuperUser) {
		const { data: storesData } = await supabase
			.from('stores')
			.select('id, name')
			.order('name');
		stores = (storesData as { id: number; name: string }[]) ?? [];
		defaultStoreId = profile?.store_id ?? stores.find((s) => s.name.toLowerCase().includes('sagunto'))?.id ?? stores[0]?.id ?? null;
	}

	const isDashboard = title.toUpperCase().includes('DEBEN');
	const isUsuarios = title.toUpperCase().includes('USUARIOS');
	const isProductos = title.toUpperCase().includes('PRODUCTOS');

	return (
		<header className="p-8 bg-white shadow-lg">
			<div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
				<div className='flex flex-wrap sm:items-center gap-2 text-slate-900'>
					<h1 className="text-xl font-bold tracking-widest">{title} | <span className='text-blue-500 uppercase'>{profile?.store?.name}</span></h1>
					<div className="flex flex-wrap items-center gap-2">
						<span>|</span>
						<span className="text-sm text-slate-500">
						<strong className="text-slate-800">{user?.email}</strong>
						</span>
						{isSuperUser && (
							<>
								<span>|</span>
								<span className="text-xs px-2 py-0.5 rounded-full font-semibold bg-blue-100 text-blue-800 border border-blue-200">
									Administrador
								</span>
							</>
						)}
					</div>
				</div>

				<div className='flex flex-wrap sm:items-center gap-2'>
					{isSuperUser && (
						<nav className="flex flex-wrap items-center gap-2">
							<StorePerspectiveSelector stores={stores} defaultStoreId={defaultStoreId} />
							<Link
								href="/dashboard"
								className={`px-4 py-2 text-sm rounded-xl transition ${
									isDashboard
										? 'font-semibold bg-blue-50 text-blue-700 border border-blue-200/60'
										: 'font-medium text-slate-600 hover:text-slate-900 hover:bg-slate-100'
								}`}
							>
								Préstamos y Movimientos
							</Link>
							<Link
								href="/dashboard/usuarios"
								className={`px-4 py-2 text-sm rounded-xl transition ${
									isUsuarios
										? 'font-semibold bg-blue-50 text-blue-700 border border-blue-200/60'
										: 'font-medium text-slate-600 hover:text-slate-900 hover:bg-slate-100'
								}`}
							>
								Usuarios de Tienda
							</Link>
							<Link
								href="/dashboard/productos"
								className={`px-4 py-2 text-sm rounded-xl transition ${
									isProductos
										? 'font-semibold bg-blue-50 text-blue-700 border border-blue-200/60'
										: 'font-medium text-slate-600 hover:text-slate-900 hover:bg-slate-100'
								}`}
							>
								Productos y Categorías
							</Link>
						</nav>
					)}
					<form action={signout}>
						<button
							type="submit"
							className="px-4 py-2 text-sm font-medium text-slate-700 bg-white border border-slate-200 rounded-xl hover:bg-slate-50 hover:text-red-600 transition shadow-sm"
						>
							Cerrar Sesión
						</button>
					</form>
				</div>

			</div>
		</header>
	);
}