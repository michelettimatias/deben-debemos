import { Suspense } from 'react';
import Link from 'next/link';
import { createClient } from '@/utils/supabase/server';
import { createAdminClient } from '@/utils/supabase/admin';
import { signout } from '@/login/actions';
import { confirmLoan } from '@/lib/actions';
import NewTransferForm, { Store } from './new-transfer-form';
import MovementsView, { TransferItem } from './movements-view';
import DashboardHeader from '@/components/DashboardHeader';

export const instant = false;

async function MovementsSection() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  // 1. Obtener todas las tiendas
  const { data: storesData } = await supabase
    .from('stores')
    .select('id, name')
    .order('name');
  const stores: Store[] = (storesData as Store[]) ?? [];

  // 2. Obtener el perfil del usuario actual
  const { data: profile } = await supabase
    .from('profiles')
    .select('store_id, role')
    .eq('id', user?.id ?? '')
    .maybeSingle();

  const isSuperUser =
    user?.email === 'michelettimatias@gmail.com' || profile?.role === 'admin';

  // 3. Obtener los movimientos / transferencias registrados
  const { data: transfersData } = await supabase
    .from('transfers')
    .select('*')
    .order('created_at', { ascending: false });

  const transfers: TransferItem[] = (transfersData as TransferItem[]) ?? [];

  // 4. Obtener productos, unidades y grupos (usando adminClient si existe para eludir restricciones RLS en servidor)
  const adminClient = createAdminClient();
  const db = adminClient || supabase;

  const [
    { data: productsData },
    { data: unitsData },
    { data: groupsData },
  ] = await Promise.all([
    db.from('products').select('id, name, group').order('name'),
    db.from('units').select('id, name').order('name'),
    db.from('groups').select('group_id, group_name').order('group_name'),
  ]);

  return (
    <>
      <MovementsView
        transfers={transfers}
        stores={stores}
        currentUserId={user?.id ?? ''}
        userStoreId={profile?.store_id}
        isSuperUser={isSuperUser}
      />
      <NewTransferForm
        stores={stores}
        currentUserEmail={user?.email ?? ''}
        userStoreId={profile?.store_id}
        isSuperUser={isSuperUser}
        initialProducts={productsData ?? []}
        units={unitsData ?? []}
        groups={groupsData ?? []}
      />
    </>
  );
}

export default function Page() {
  return (
    <div className="w-full max-h-screen overflow-hidden flex flex-col">
		<Suspense fallback={<div className="h-24 animate-pulse bg-slate-200/70 rounded-2xl mb-8" />}>
			<DashboardHeader title='DEBEN / DEBEMOS' />
		</Suspense>
		<div className='grid grid-cols-3 gap-4 p-4 w-full h-full grow-1 overflow-hidden'>
			<Suspense fallback={<div className="h-64 animate-pulse bg-slate-200/70 rounded-2xl" />}>
				<MovementsSection />
			</Suspense>
		</div>
    </div>
  );
}