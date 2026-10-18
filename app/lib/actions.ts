'use server';

import { createClient } from '@/utils/supabase/server';
import { createAdminClient } from '@/utils/supabase/admin';
import { revalidatePath } from 'next/cache';

// 1. Registrar un nuevo préstamo o devolución inicial
export type TransferState = {
  error?: string | null;
  success?: string | null;
};

export async function createTransfer(
  prevState: TransferState | null,
  formData: FormData
): Promise<TransferState> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { error: 'Debes iniciar sesión para registrar un movimiento.' };
  }

  const item_name = (formData.get('item_name') as string)?.trim();
  const quantity = Number(formData.get('quantity'));
  const unit = (formData.get('unit') as string)?.trim() || 'unidades';
  const customUnit = (formData.get('custom_unit') as string)?.trim();
  const finalUnit = unit === 'otra' && customUnit ? customUnit : unit;
  const loan_date =
    (formData.get('loan_date') as string) || new Date().toISOString().split('T')[0];

  let sender_store_id = Number(formData.get('sender_store_id'));
  const receiver_store_id = Number(formData.get('receiver_store_id'));

  if (!item_name) {
    return { error: 'Por favor, introduce el nombre del producto o artículo.' };
  }
  if (!quantity || quantity <= 0) {
    return { error: 'La cantidad debe ser un número mayor a 0.' };
  }
  if (!receiver_store_id) {
    return { error: 'Debes seleccionar la tienda a la que se presta el producto.' };
  }

  // Comprobar si es el superusuario administrador
  const isSuperUser =
    user.email === 'michelettimatias@gmail.com';

  // Obtener o asegurar el perfil del usuario en la tabla 'profiles'
  const { data: profile } = await supabase
    .from('profiles')
    .select('id, store_id, role')
    .eq('id', user.id)
    .maybeSingle();

  if (!profile) {
    // Si no existe perfil en la tabla 'profiles', intentamos crearlo para satisfacer la clave foránea
    await supabase.from('profiles').upsert({
      id: user.id,
      email: user.email,
      role: isSuperUser ? 'admin' : 'user',
      store_id: sender_store_id || null,
    });
  }

  if (!isSuperUser) {
    // Si no es superusuario, la tienda origen se toma estrictamente de su perfil
    if (profile?.role === 'admin') {
      // Si tiene rol admin en base de datos, también se le permite elegir
    } else if (profile?.store_id) {
      sender_store_id = Number(profile.store_id);
    } else if (sender_store_id) {
      // Si se envió sender_store_id pero no estaba en perfil, actualizar perfil
      await supabase
        .from('profiles')
        .update({ store_id: sender_store_id })
        .eq('id', user.id);
    } else {
      return {
        error:
          'Tu usuario aún no tiene una tienda asociada en su perfil. Contacta con el administrador.',
      };
    }
  }

  if (!sender_store_id) {
    return { error: 'Debes especificar la tienda de origen que presta el producto.' };
  }

  if (sender_store_id === receiver_store_id) {
    return { error: 'La tienda que presta y la tienda que recibe no pueden ser la misma.' };
  }

  // Intento 1: Inserción directa con columnas dedicadas 'unit' y 'loan_date'
  const insertPayload: Record<string, any> = {
    item_name,
    quantity,
    sender_store_id,
    receiver_store_id,
    status: 'PENDING_LOAN',
    created_by_user_id: user.id,
    unit: finalUnit,
    loan_date,
  };

  let { error } = await supabase.from('transfers').insert(insertPayload);

  if (error) {
    return { error: `Error al registrar el préstamo: ${error.message}` };
  }

  revalidatePath('/dashboard');
  return {
    success: `¡Préstamo de ${quantity} ${finalUnit} de "${item_name}" registrado correctamente!`,
  };
}

// 2. Confirmar la recepción del préstamo por parte de la tienda receptora
export async function confirmLoan(transferId: number, userId: string) {
  const supabase = await createClient();

  const { error } = await supabase
    .from('transfers')
    .update({
      status: 'ACTIVE',
      confirmed_by_user_id: userId,
      updated_at: new Date().toISOString(),
    })
    .eq('id', transferId)
    .eq('status', 'PENDING_LOAN');

  if (error) {
    throw new Error(`Error al confirmar el préstamo: ${error.message}`);
  }

  revalidatePath('/dashboard');
}

// 2b. Iniciar la devolución del producto (quien recibió el préstamo lo devuelve)
export async function initiateReturn(transferId: number, userId: string) {
  const supabase = await createClient();

  const { error } = await supabase
    .from('transfers')
    .update({
      status: 'PENDING_RETURN',
      updated_at: new Date().toISOString(),
    })
    .eq('id', transferId)
    .eq('status', 'ACTIVE');

  if (error) {
    throw new Error(`Error al iniciar la devolución: ${error.message}`);
  }

  revalidatePath('/dashboard');
}

// 2c. Confirmar la recepción de la devolución por parte de la tienda que lo prestó
export async function confirmReturn(transferId: number, userId: string) {
  const supabase = await createClient();

  const { error } = await supabase
    .from('transfers')
    .update({
      status: 'RETURNED',
      confirmed_by_user_id: userId,
      updated_at: new Date().toISOString(),
    })
    .eq('id', transferId)
    .eq('status', 'PENDING_RETURN');

  if (error) {
    throw new Error(`Error al confirmar la devolución: ${error.message}`);
  }

  revalidatePath('/dashboard');
}

// 3. Crear una tienda si no existe
export async function createStoreAction(formData: FormData) {
  const name = (formData.get('name') as string)?.trim();
  if (!name) return { error: 'El nombre de la tienda es requerido.' };

  const supabase = await createClient();
  const { error } = await supabase.from('stores').insert({ name });

  if (error) {
    return { error: `Error al crear tienda: ${error.message}` };
  }

  revalidatePath('/dashboard');
  return { success: `Tienda "${name}" creada exitosamente.` };
}

export type ProductItem = {
  id: number;
  name: string;
  group?: number | null;
  product_unit?: number | null;
};

export type UnitItem = {
  id: number;
  name: string;
};

export type GroupItem = {
  group_id: number;
  group_name: string;
};

// 4. Crear un nuevo producto en la tabla 'products'
export async function createProductAction(data: {
  name: string;
  group?: number | null;
  product_unit?: number | null;
}) {
  const name = data.name?.trim();
  if (!name) {
    return { error: 'El nombre del producto es requerido.' };
  }

  const supabase = await createClient();
  const { data: userAuth } = await supabase.auth.getUser();
  if (!userAuth.user) {
    return { error: 'Debes iniciar sesión para crear productos.' };
  }

  const payload: { name: string; group?: number | null; product_unit?: number | null } = { name };
  if (data.group !== undefined && data.group !== null && !isNaN(data.group)) {
    payload.group = Number(data.group);
  }
  if (data.product_unit !== undefined && data.product_unit !== null && !isNaN(data.product_unit)) {
    payload.product_unit = Number(data.product_unit);
  }

  // Usar adminClient si está configurado en .env para eludir RLS, o supabase de sesión
  const adminClient = createAdminClient();
  const db = adminClient || supabase;

  const { data: newProduct, error } = await db
    .from('products')
    .insert(payload)
    .select('id, name, group, product_unit')
    .single();

  if (error) {
    return { error: `Error al crear producto: ${error.message}` };
  }

  revalidatePath('/dashboard');
  revalidatePath('/dashboard/productos');
  return { success: true, product: newProduct as ProductItem };
}