import type { AuthContext } from "@/lib/authorize"

type SoftDeleteTable = "customers" | "suppliers" | "items" | "invoices" | "purchases" | "payments"

export async function softDelete(
  ctx: AuthContext,
  table: SoftDeleteTable,
  id: string,
): Promise<{ success: boolean; error?: string }> {
  const { error } = await ctx.supabase
    .from(table)
    .update({ deleted_at: new Date().toISOString() })
    .eq("id", id)
    .is("deleted_at", null)

  if (error) return { success: false, error: error.message }
  return { success: true }
}

export async function softDeleteBulk(
  ctx: AuthContext,
  table: SoftDeleteTable,
  ids: string[],
): Promise<{ success: boolean; deleted: number; error?: string }> {
  const { error, count } = await ctx.supabase
    .from(table)
    .update({ deleted_at: new Date().toISOString() })
    .in("id", ids)
    .is("deleted_at", null)
    .select("id")

  if (error) return { success: false, deleted: 0, error: error.message }
  return { success: true, deleted: count || ids.length }
}

export async function restore(
  ctx: AuthContext,
  table: SoftDeleteTable,
  id: string,
): Promise<{ success: boolean; error?: string }> {
  const { error } = await ctx.supabase
    .from(table)
    .update({ deleted_at: null })
    .eq("id", id)

  if (error) return { success: false, error: error.message }
  return { success: true }
}

export function notDeleted(): string {
  return "deleted_at.is.null"
}
