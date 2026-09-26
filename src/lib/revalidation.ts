import { revalidatePath } from 'next/cache'

// ─────────────────────────────────────────────────────────────
// Centraliza las rutas que deben revalidarse cuando cambian
// datos de un dominio. Evita que cada action tenga su propia
// lista hardcodeada de paths (propenso a olvidar rutas).
// ─────────────────────────────────────────────────────────────

/** Revalida rutas afectadas por cambios en ventas (incluye dashboard, finanzas). */
export function revalidateSalePaths() {
  revalidatePath('/sales')
  revalidatePath('/credits')
  revalidatePath('/inventory')
  revalidatePath('/finances')
  revalidatePath('/dashboard')
}

/** Revalida rutas afectadas por cambios en inventario. */
export function revalidateInventoryPaths() {
  revalidatePath('/inventory')
  revalidatePath('/dashboard')
}

/** Revalida rutas afectadas por cambios en pedidos web. */
export function revalidateWebOrderPaths() {
  revalidatePath('/web/orders')
  revalidatePath('/web')
  revalidatePath('/inventory')
}

/** Revalida rutas de la tienda online (productos, settings). */
export function revalidateWebCatalogPaths() {
  revalidatePath('/web/products')
  revalidatePath('/api/web/products')
  revalidatePath('/web')
}

/** Revalida rutas afectadas por cambios en finanzas. */
export function revalidateFinancePaths() {
  revalidatePath('/finances')
  revalidatePath('/finances/transactions')
  revalidatePath('/dashboard')
}

/** Revalida rutas afectadas por cambios en clientes. */
export function revalidateClientPaths() {
  revalidatePath('/clients')
}
