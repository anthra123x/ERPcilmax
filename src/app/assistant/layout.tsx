import { DashboardLayout as DashboardLayoutComponent } from '@/components/layout/dashboard-layout'
import { getCurrentUser } from '@/modules/auth/auth.actions'
import { redirect } from 'next/navigation'

export default async function AssistantLayout({ children }: { children: React.ReactNode }) {
  const user = await getCurrentUser()

  if (!user) {
    redirect('/login')
  }

  return <DashboardLayoutComponent user={user}>{children}</DashboardLayoutComponent>
}