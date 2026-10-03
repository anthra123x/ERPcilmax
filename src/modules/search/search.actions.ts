'use server'

import { prisma } from '@/lib/prisma'
import { requireAuth } from '@/modules/auth/auth.actions'

export interface GlobalSearchResult {
  products: Array<{
    id: string
    name: string
    barcode: string | null
    salePrice: number
    stock: number
    category: { name: string } | null
  }>
  clients: Array<{
    id: string
    name: string
    phone: string | null
    email: string | null
  }>
  sales: Array<{
    id: string
    invoiceNumber: string
    total: number
  }>
}

export async function globalSearch(query: string): Promise<GlobalSearchResult> {
  await requireAuth()

  const q = query.trim().slice(0, 100)
  if (q.length < 2) {
    return { products: [], clients: [], sales: [] }
  }

  const contains = { contains: q, mode: 'insensitive' as const }

  const [products, clients, sales] = await Promise.all([
    prisma.product.findMany({
      where: {
        deletedAt: null,
        OR: [
          { name: contains },
          { description: contains },
          { barcode: contains },
          { category: { name: { contains: q, mode: 'insensitive' } } },
        ],
      },
      orderBy: { name: 'asc' },
      take: 6,
      select: {
        id: true,
        name: true,
        barcode: true,
        salePrice: true,
        stock: true,
        category: { select: { name: true } },
      },
    }),
    prisma.client.findMany({
      where: {
        deletedAt: null,
        OR: [{ name: contains }, { phone: contains }, { email: contains }],
      },
      orderBy: { name: 'asc' },
      take: 4,
      select: { id: true, name: true, phone: true, email: true },
    }),
    prisma.sale.findMany({
      where: { invoiceNumber: contains },
      orderBy: { saleDate: 'desc' },
      take: 4,
      select: { id: true, invoiceNumber: true, total: true },
    }),
  ])

  return { products, clients, sales }
}
