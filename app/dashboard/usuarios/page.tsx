import { Suspense } from 'react';
import { createClient } from '@/utils/supabase/server';
import { createAdminClient } from '@/utils/supabase/admin';
import UserList, { UserProfile, Store } from './user-list';
import DashboardHeader from '@/components/DashboardHeader';

export const instant = false;

async function UsersContent() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const adminClient = createAdminClient();

  // 1. Obtener todas las tiendas
  const { data: storesData } = await supabase
    .from('stores')
    .select('id, name')
    .order('name');
  const stores: Store[] = (storesData as Store[]) ?? [];

  // 2. Obtener los perfiles existentes
  const { data: profilesData } = await supabase
    .from('profiles')
    .select('*')
    .order('created_at', { ascending: false });

  let users: UserProfile[] = (profilesData as UserProfile[]) ?? [];

  // 3. Si hay adminClient, verificar si hay usuarios en auth.users no sincronizados en profiles
  if (adminClient) {
    const { data: authUsers } = await adminClient.auth.admin.listUsers();
    if (authUsers?.users) {
      const profileIds = new Set(users.map((u) => u.id));
      for (const au of authUsers.users) {
        if (!profileIds.has(au.id)) {
          users.push({
            id: au.id,
            email: au.email || '',
            full_name: (au.user_metadata?.full_name as string) || null,
            role: 'user',
            store_id: null,
            created_at: au.created_at,
          });
        }
      }
    }
  }

  return (
    <div>
      {!process.env.SUPABASE_SERVICE_ROLE_KEY && (
        <div className="mb-6 p-4 rounded-xl bg-blue-50/70 border border-blue-200 text-blue-900 text-xs flex items-start gap-3">
          <svg className="w-5 h-5 shrink-0 text-blue-600 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <div className="leading-relaxed">
            <strong>Modo estándar activo:</strong> Puedes asignar tiendas, cambiar nombres y enviar enlaces de restablecimiento de contraseña. Si deseas aplicar <em>cambios inmediatos de contraseñas directas</em> o sincronizar correos en Auth sin confirmación, agrega <code className="bg-white px-1.5 py-0.5 rounded border border-blue-200 font-mono text-blue-800">SUPABASE_SERVICE_ROLE_KEY</code> a tu archivo <code className="bg-white px-1.5 py-0.5 rounded border border-blue-200 font-mono">.env</code>.
          </div>
        </div>
      )}

      <UserList
        users={users}
        stores={stores}
        currentUserId={user?.id ?? ''}
      />
    </div>
  );
}

export default function UsuariosPage() {
  return (
    <div className="w-full max-h-screen overflow-hidden flex flex-col">
        <Suspense fallback={<div className="h-24 animate-pulse bg-slate-200/70 rounded-2xl mb-8" />}>
          <DashboardHeader title='USUARIOS' />
        </Suspense>
		<div className='flex flex-col gap-4 p-4 w-full h-full grow-1 overflow-hidden'>
			<Suspense fallback={<div className="h-72 animate-pulse bg-slate-200/70 rounded-2xl" />}>
				<UsersContent />
			</Suspense>
		</div>
    </div>
  );
}
