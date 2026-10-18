import { createClient } from '@supabase/supabase-js';

// Cliente administrativo con privilegios elevados (service_role) para gestión de usuarios.
// Solo debe utilizarse en entornos seguros de servidor (Server Actions / Route Handlers).
export function createAdminClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !serviceRoleKey) {
    return null;
  }

  return createClient(supabaseUrl, serviceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });
}
