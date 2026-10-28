import { createClient } from '@/utils/supabase/server';
import { signout } from '@/login/actions';
import StorePerspectiveSelector from './StorePerspectiveSelector';
import HeaderLink from './HeaderLink';

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
		<header className="p-4 lg:p-8 bg-white shadow-lg flex flex-col lg:flex-row justify-between gap-4">
				<div className='flex flex-col lg:flex-row items-center gap-2 text-slate-900'>
					<h1 className="text-lg lg:text-xl font-bold tracking-wider">{title} | <span className='text-blue-500 uppercase'>{profile?.store?.name}</span></h1>
					<div className="flex flex-wrap items-center gap-2">
						<span className='hidden lg:inline'>|</span>
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

				<div className='flex flex-col lg:flex-row items-center justify-center gap-2'>
					{isSuperUser && (
						<>
							<StorePerspectiveSelector stores={stores} defaultStoreId={defaultStoreId} />
							<HeaderLink
								href="/dashboard"
							>
								MOVIMIENTOS
							</HeaderLink>
							<HeaderLink
								href="/dashboard/usuarios"
							>
								USUARIOS
							</HeaderLink>
							<HeaderLink
								href="/dashboard/productos"
							>
								PRODUCTOS
							</HeaderLink>
						</>
					)}
					<form action={signout} className='w-full lg:w-auto'>
						<button
							type="submit"
							className="w-full lg:w-auto px-4 py-2 text-center text-xs tracking-widest font-bold rounded-md transition text-slate-700 bg-white border border-slate-200 hover:bg-red-700 hover:border-red-700 hover:text-white shadow-sm cursor-pointer"
						>
							CERRAR SESIÓN
						</button>
					</form>
				</div>
		</header>
	);
}