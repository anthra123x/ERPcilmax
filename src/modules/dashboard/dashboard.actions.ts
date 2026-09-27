'use server'

import { requireAuth } from '@/modules/auth/auth.actions'
import { getDashboardOverviewService } from './dashboard.service'
import type { DashboardOverview } from './dashboard.service'

export type { DashboardOverview }

export async function getDashboardStats() {
  await requireAuth()
  const overview = await getDashboardOverviewService()

  return {
    ...overview,
    // Compatibilidad con props anteriores
    lowStockProducts: overview.inventorySummary.lowStockProducts,
    totalProducts: overview.inventorySummary.totalProducts,
    pendingCredit: overview.pendingCreditTotal,
  }
}
