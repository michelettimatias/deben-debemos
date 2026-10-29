import { Suspense } from 'react';
import { redirect } from 'next/navigation';
import { createClient } from '@/utils/supabase/server';
import { createAdminClient } from '@/utils/supabase/admin';
import ProductsManagementView from './products-view';
import { ProductRow, UnitRow, GroupRow } from './actions';

export const instant = false;

async function ProductsContent() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect('/login');
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .maybeSingle();

  const isSuperUser = user.email === 'michelettimatias@gmail.com' || profile?.role === 'admin';

  if (!isSuperUser) {
    redirect('/dashboard');
  }

  // Cliente de base de datos (con fallback a adminClient si está en .env para eludir RLS en servidor)
  const adminClient = createAdminClient();
  const db = adminClient || supabase;

  // Cargar productos, unidades y grupos en paralelo
  const [
    { data: productsData, error: pErr },
    { data: unitsData, error: uErr },
    { data: groupsData, error: gErr },
  ] = await Promise.all([
    db.from('products').select('*').order('name'),
    db.from('units').select('*').order('name'),
    db.from('groups').select('*').order('group_name'),
  ]);

  if (pErr) console.error('Error fetching products:', pErr.message);
  if (uErr) console.error('Error fetching units:', uErr.message);
  if (gErr) console.error('Error fetching groups:', gErr.message);

  const products: ProductRow[] = (productsData as ProductRow[]) ?? [];
  const units: UnitRow[] = (unitsData as UnitRow[]) ?? [];
  const groups: GroupRow[] = (groupsData as GroupRow[]) ?? [];

  return (
      <ProductsManagementView
        initialProducts={products}
        initialUnits={units}
        initialGroups={groups}
      />
  );
}

export default function ProductosPage() {
  return (
		<div className='flex flex-col gap-4 p-4 w-full h-full grow-1 overflow-hidden'>
			<Suspense fallback={<div className="h-72 animate-pulse bg-slate-200/70 rounded-2xl" />}>
				<ProductsContent />
			</Suspense>
		</div>
  );
}
