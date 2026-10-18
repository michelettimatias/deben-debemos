'use server';

import { revalidatePath } from 'next/cache';
import { createClient } from '@/utils/supabase/server';
import { createAdminClient } from '@/utils/supabase/admin';

export type UserActionState = {
  error?: string | null;
  success?: string | null;
};

// Verificar si el usuario actual es administrador
async function verifyAdmin() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    throw new Error('No autenticado.');
  }

  const isSuperUser = user.email === 'michelettimatias@gmail.com';
  if (isSuperUser) {
    return { supabase, user, isSuperUser: true };
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .maybeSingle();

  if (profile?.role !== 'admin') {
    throw new Error('Acceso denegado: Se requieren permisos de administrador.');
  }

  return { supabase, user, isSuperUser: false };
}

// 1. Modificar perfil de usuario y tienda asignada
export async function updateUser(
  prevState: UserActionState | null,
  formData: FormData
): Promise<UserActionState> {
  try {
    const { supabase } = await verifyAdmin();
    const adminClient = createAdminClient();

    const userId = formData.get('userId') as string;
    const fullName = (formData.get('fullName') as string)?.trim();
    const email = (formData.get('email') as string)?.trim().toLowerCase();
    const role = formData.get('role') as string;
    const storeIdRaw = formData.get('storeId') as string;
    const storeId = storeIdRaw ? Number(storeIdRaw) : null;

    if (!userId) {
      return { error: 'ID de usuario no especificado.' };
    }
    if (!email) {
      return { error: 'El correo electrónico es obligatorio.' };
    }

    // Actualizar en auth.users si hay adminClient y el correo cambió
    let authUpdated = false;
    if (adminClient) {
      const { error: authErr } = await adminClient.auth.admin.updateUserById(userId, {
        email,
        email_confirm: true,
        user_metadata: { full_name: fullName },
      });
      if (authErr) {
        return { error: `Error al actualizar en Auth: ${authErr.message}` };
      }
      authUpdated = true;
    }

    // Actualizar en la tabla profiles (usando adminClient si existe para eludir restricciones de RLS)
    const clientForProfiles = adminClient || supabase;
    const { error: profErr } = await clientForProfiles
      .from('profiles')
      .upsert({
        id: userId,
        email,
        full_name: fullName,
        role: role || 'user',
        store_id: storeId,
      });

    if (profErr) {
      return { error: `Error al actualizar perfil: ${profErr.message}` };
    }

    revalidatePath('/dashboard/usuarios');
    revalidatePath('/dashboard');

    return {
      success: `Usuario actualizado correctamente${
        !authUpdated
          ? ' (Nota: Para sincronizar el correo en Auth sin confirmación, define SUPABASE_SERVICE_ROLE_KEY).'
          : ''
      }.`,
    };
  } catch (err: any) {
    return { error: err.message || 'Error inesperado al actualizar usuario.' };
  }
}

// 2. Restaurar o cambiar contraseña de un usuario
export async function resetPassword(
  prevState: UserActionState | null,
  formData: FormData
): Promise<UserActionState> {
  try {
    const { supabase } = await verifyAdmin();
    const adminClient = createAdminClient();

    const userId = formData.get('userId') as string;
    const email = (formData.get('email') as string)?.trim().toLowerCase();
    const newPassword = (formData.get('newPassword') as string)?.trim();

    if (!email) {
      return { error: 'El correo electrónico es obligatorio.' };
    }

    // Caso A: Se proporcionó una nueva contraseña directamente
    if (newPassword) {
      if (newPassword.length < 6) {
        return { error: 'La nueva contraseña debe tener al menos 6 caracteres.' };
      }

      if (adminClient) {
        const { error: updateErr } = await adminClient.auth.admin.updateUserById(userId, {
          password: newPassword,
        });

        if (updateErr) {
          return { error: `Error al cambiar contraseña: ${updateErr.message}` };
        }

        return {
          success: `Contraseña cambiada exitosamente para ${email}. Ya puede iniciar sesión con la nueva clave.`,
        };
      } else {
        // Sin service_role key, enviamos el correo oficial de recuperación
        const { error: resetErr } = await supabase.auth.resetPasswordForEmail(email, {
          redirectTo: `${process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000'}/login`,
        });

        if (resetErr) {
          return { error: `Error al enviar correo de restablecimiento: ${resetErr.message}` };
        }

        return {
          success: `Se envió un correo de restablecimiento a ${email} (Para asignar contraseñas directas sin email, añade SUPABASE_SERVICE_ROLE_KEY en .env).`,
        };
      }
    }

    // Caso B: Enviar enlace de restablecimiento al correo
    const { error: resetErr } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000'}/login`,
    });

    if (resetErr) {
      return { error: `Error al enviar enlace de restablecimiento: ${resetErr.message}` };
    }

    return {
      success: `Correo de recuperación enviado a ${email}. El usuario recibirá un enlace para crear una nueva clave.`,
    };
  } catch (err: any) {
    return { error: err.message || 'Error al restablecer contraseña.' };
  }
}

// 3. Crear un nuevo usuario de tienda
export async function createNewUser(
  prevState: UserActionState | null,
  formData: FormData
): Promise<UserActionState> {
  try {
    const { supabase } = await verifyAdmin();
    const adminClient = createAdminClient();

    const email = (formData.get('email') as string)?.trim().toLowerCase();
    const password = (formData.get('password') as string)?.trim();
    const fullName = (formData.get('fullName') as string)?.trim();
    const role = (formData.get('role') as string) || 'user';
    const storeIdRaw = formData.get('storeId') as string;
    const storeId = storeIdRaw ? Number(storeIdRaw) : null;

    if (!email || !password) {
      return { error: 'El correo y la contraseña son obligatorios.' };
    }
    if (password.length < 6) {
      return { error: 'La contraseña debe tener al menos 6 caracteres.' };
    }

    let createdUserId: string | null = null;

    if (adminClient) {
      // Creación directa confirmada con cliente admin
      const { data: newUser, error: createErr } = await adminClient.auth.admin.createUser({
        email,
        password,
        email_confirm: true,
        user_metadata: { full_name: fullName },
      });

      if (createErr) {
        return { error: `Error al crear usuario en Auth: ${createErr.message}` };
      }
      createdUserId = newUser.user.id;
    } else {
      // Registro regular con supabase auth
      const { data: signData, error: signErr } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: { full_name: fullName },
        },
      });

      if (signErr) {
        return { error: `Error al registrar usuario: ${signErr.message}` };
      }
      createdUserId = signData.user?.id ?? null;
    }

    if (createdUserId) {
      // Guardar o actualizar perfil con la tienda asignada
      const clientForProfiles = adminClient || supabase;
      await clientForProfiles.from('profiles').upsert({
        id: createdUserId,
        email,
        full_name: fullName,
        role,
        store_id: storeId,
      });
    }

    revalidatePath('/dashboard/usuarios');
    return {
      success: `Usuario ${email} creado correctamente con tienda asignada.`,
    };
  } catch (err: any) {
    return { error: err.message || 'Error al crear usuario.' };
  }
}
