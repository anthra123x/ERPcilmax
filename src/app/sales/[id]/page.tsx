import { redirect } from 'next/navigation'

interface SaleDetailPageProps {
  params: Promise<{ id: string }>
}

export default async function SaleDetailPage({ params }: SaleDetailPageProps) {
  const { id } = await params
  redirect(`/sales/${id}/invoice`)
}
