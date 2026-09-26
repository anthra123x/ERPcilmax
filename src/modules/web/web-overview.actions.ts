'use server'

/**
 * web-overview.actions.ts
 * Resumen del panel de la tienda online.
 *
 * Action delgada: autentica y delega. El acceso a datos vive en
 * `web-overview.service.ts` (frontera de capas del monolito modular).
 */
import { requireAuth } from '@/modules/auth/auth.actions'
import { getWebOverviewStats } from './web-overview.service'

export async function getWebOverview() {
  await requireAuth()

  return await getWebOverviewStats()
}
