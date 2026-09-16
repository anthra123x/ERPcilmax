import { DashboardLayout } from '@/components/layout/dashboard-layout'
import { requireAuth } from '@/modules/auth/auth.actions'

export default async function WebLayout({ children }: { children: React.ReactNode }) {
  const user = await requireAuth()
  return <DashboardLayout user={user}>{children}</DashboardLayout>
}
