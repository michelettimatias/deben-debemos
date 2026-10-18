'use server';

import { revalidatePath } from 'next/cache';
import { createClient } from '@/utils/supabase/server';
import { createAdminClient } from '@/utils/supabase/admin';

// Tipos compartidos
export type ProductRow = {
  id: number;
  name: string;
  product_unit?: number | null;
  group?: number | null;
  created_at?: string;
};

export type UnitRow = {
  id: number;
  name: string;
  abreviation?: string | null;
  created_at?: string;
};

export type GroupRow = {
  group_id: number;
  group_name: string;
  created_at?: string;
};

// Verificar si el usuario es administrador
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
    return { supabase, user };
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .maybeSingle();

  if (profile?.role !== 'admin') {
    throw new Error('Acceso denegado: se requieren privilegios de administrador.');
  }

  return { supabase, user };
}

// Obtener cliente (prioriza adminClient si está definido para eludir RLS en servidor)
async function getDbClient() {
  const { supabase } = await verifyAdmin();
  const adminClient = createAdminClient();
  return adminClient || supabase;
}

// =========================================================================
// ACCIONES PARA PRODUCTOS
// =========================================================================

export async function saveProductAction(data: {
  id?: number;
  name: string;
  product_unit?: number | null;
  group?: number | null;
}) {
  try {
    const db = await getDbClient();
    const name = data.name?.trim();
    if (!name) {
      return { error: 'El nombre del producto es obligatorio.' };
    }

    const payload: {
      name: string;
      product_unit?: number | null;
      group?: number | null;
    } = {
      name,
      product_unit: data.product_unit ? Number(data.product_unit) : null,
      group: data.group ? Number(data.group) : null,
    };

    if (data.id) {
      // Actualizar producto existente
      const { data: updated, error } = await db
        .from('products')
        .update(payload)
        .eq('id', data.id)
        .select('*')
        .single();

      if (error) {
        return { error: `Error al actualizar producto: ${error.message}` };
      }
      revalidatePath('/dashboard/productos');
      revalidatePath('/dashboard');
      return { success: true, product: updated as ProductRow };
    } else {
      // Crear nuevo producto
      const { data: created, error } = await db
        .from('products')
        .insert(payload)
        .select('*')
        .single();

      if (error) {
        return { error: `Error al crear producto: ${error.message}` };
      }
      revalidatePath('/dashboard/productos');
      revalidatePath('/dashboard');
      return { success: true, product: created as ProductRow };
    }
  } catch (err: any) {
    return { error: err.message || 'Error inesperado al guardar el producto.' };
  }
}

export async function deleteProductAction(id: number) {
  try {
    const db = await getDbClient();
    if (!id) return { error: 'ID de producto no válido.' };

    const { error } = await db.from('products').delete().eq('id', id);
    if (error) {
      return { error: `Error al eliminar producto: ${error.message}` };
    }

    revalidatePath('/dashboard/productos');
    revalidatePath('/dashboard');
    return { success: true };
  } catch (err: any) {
    return { error: err.message || 'Error inesperado al eliminar el producto.' };
  }
}

// =========================================================================
// ACCIONES PARA CATEGORÍAS (GROUPS)
// =========================================================================

export async function saveGroupAction(data: {
  group_id?: number;
  group_name: string;
}) {
  try {
    const db = await getDbClient();
    const group_name = data.group_name?.trim();
    if (!group_name) {
      return { error: 'El nombre de la categoría es obligatorio.' };
    }

    if (data.group_id) {
      // Actualizar categoría existente
      const { data: updated, error } = await db
        .from('groups')
        .update({ group_name })
        .eq('group_id', data.group_id)
        .select('*')
        .single();

      if (error) {
        return { error: `Error al actualizar categoría: ${error.message}` };
      }
      revalidatePath('/dashboard/productos');
      revalidatePath('/dashboard');
      return { success: true, group: updated as GroupRow };
    } else {
      // Crear nueva categoría
      const { data: created, error } = await db
        .from('groups')
        .insert({ group_name })
        .select('*')
        .single();

      if (error) {
        return { error: `Error al crear categoría: ${error.message}` };
      }
      revalidatePath('/dashboard/productos');
      revalidatePath('/dashboard');
      return { success: true, group: created as GroupRow };
    }
  } catch (err: any) {
    return { error: err.message || 'Error inesperado al guardar la categoría.' };
  }
}

export async function deleteGroupAction(groupId: number) {
  try {
    const db = await getDbClient();
    if (!groupId) return { error: 'ID de categoría no válido.' };

    // Verificar si hay productos asociados a esta categoría
    const { count, error: countErr } = await db
      .from('products')
      .select('id', { count: 'exact', head: true })
      .eq('group', groupId);

    if (count && count > 0) {
      return {
        error: `No se puede eliminar la categoría porque tiene ${count} ${
          count === 1 ? 'producto asociado' : 'productos asociados'
        }. Reasígnalos o desvincula la categoría antes de eliminarla.`,
      };
    }

    const { error } = await db.from('groups').delete().eq('group_id', groupId);
    if (error) {
      return { error: `Error al eliminar categoría: ${error.message}` };
    }

    revalidatePath('/dashboard/productos');
    revalidatePath('/dashboard');
    return { success: true };
  } catch (err: any) {
    return { error: err.message || 'Error inesperado al eliminar la categoría.' };
  }
}

// =========================================================================
// ACCIONES PARA UNIDADES DE MEDIDA (UNITS)
// =========================================================================

export async function saveUnitAction(data: {
  id?: number;
  name: string;
  abreviation?: string;
}) {
  try {
    const db = await getDbClient();
    const name = data.name?.trim();
    if (!name) {
      return { error: 'El nombre de la unidad es obligatorio.' };
    }

    const payload: { name: string; abreviation?: string | null } = {
      name,
      abreviation: data.abreviation?.trim() || null,
    };

    if (data.id) {
      // Actualizar unidad existente
      const { data: updated, error } = await db
        .from('units')
        .update(payload)
        .eq('id', data.id)
        .select('*')
        .single();

      if (error) {
        return { error: `Error al actualizar unidad: ${error.message}` };
      }
      revalidatePath('/dashboard/productos');
      revalidatePath('/dashboard');
      return { success: true, unit: updated as UnitRow };
    } else {
      // Crear nueva unidad
      const { data: created, error } = await db
        .from('units')
        .insert(payload)
        .select('*')
        .single();

      if (error) {
        return { error: `Error al crear unidad: ${error.message}` };
      }
      revalidatePath('/dashboard/productos');
      revalidatePath('/dashboard');
      return { success: true, unit: created as UnitRow };
    }
  } catch (err: any) {
    return { error: err.message || 'Error inesperado al guardar la unidad.' };
  }
}

export async function deleteUnitAction(id: number) {
  try {
    const db = await getDbClient();
    if (!id) return { error: 'ID de unidad no válido.' };

    // Verificar si hay productos asociados a esta unidad
    const { count, error: countErr } = await db
      .from('products')
      .select('id', { count: 'exact', head: true })
      .eq('product_unit', id);

    if (count && count > 0) {
      return {
        error: `No se puede eliminar la unidad porque tiene ${count} ${
          count === 1 ? 'producto asociado' : 'productos asociados'
        }. Modifica esos productos antes de borrarla.`,
      };
    }

    const { error } = await db.from('units').delete().eq('id', id);
    if (error) {
      return { error: `Error al eliminar unidad: ${error.message}` };
    }

    revalidatePath('/dashboard/productos');
    revalidatePath('/dashboard');
    return { success: true };
  } catch (err: any) {
    return { error: err.message || 'Error inesperado al eliminar la unidad.' };
  }
}
