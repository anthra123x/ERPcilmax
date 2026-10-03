import { prisma } from '@/lib/prisma'
import { getClientStats } from '@/modules/clients/clients.actions'

export interface DashboardOverview {
  salesToday: {
    count: number
    total: number
    profit: number
    averageTicket: number
    profitMarginPercent: number
  }
  salesThisMonth: {
    count: number
    total: number
  }
  incomeToday: number
  pendingCreditTotal: number
  pendingCreditClientsCount: number
  webOrdersSummary: {
    pendingCount: number
    pendingOrdersTotal: number
    pendingOrders: Array<{
      id: string
      reference: string | null
      customerName: string
      customerPhone: string
      total: number
      createdAt: Date
    }>
  }
  inventorySummary: {
    totalProducts: number
    lowStockCount: number
    outOfStockCount: number
    lowStockProducts: Array<{
      id: string
      name: string
      stock: number
      lowStockThreshold: number
      salePrice: number
    }>
  }
  clientStats: {
    totalClients: number
    newClientsThisMonth: number
  }
  recentSales: Array<{
    id: string
    invoiceNumber: string
    total: number
    paymentMethod: string
    saleDate: Date
    client: { id: string; name: string } | null
  }>
  salesByPayment: Array<{
    paymentMethod: string
    _count: { id: number }
    _sum: { total: number | null }
  }>
  salesByMonth: Array<{
    month: string
    total: number
    count: number
  }>
  topProducts: Array<{
    productId: string
    quantity: number
    total: number
    name: string
  }>
}

export async function getDashboardOverviewService(): Promise<DashboardOverview> {
  const now = new Date()
  const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0)
  const endOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999)

  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1, 0, 0, 0)

  const [
    salesTodayData,
    salesTodayItems,
    salesMonthData,
    incomeTodaySales,
    incomeTodayPayments,
    creditSales,
    webOrdersPendingCount,
    webOrdersPendingSum,
    webPendingList,
    lowStockList,
    lowStockTotalCountRaw,
    outOfStockCount,
    totalProducts,
    clientStats,
    recentSales,
    salesByMonthData,
    topItemsGroup,
    salesByPayment,
  ] = await Promise.all([
    // 1. Ventas de hoy
    prisma.sale.aggregate({
      where: { status: 'COMPLETED', saleDate: { gte: startOfDay, lte: endOfDay } },
      _count: { id: true },
      _sum: { total: true },
    }),
    // 2. Items vendidos hoy para calcular ganancia y margen real
    prisma.saleItem.findMany({
      where: {
        sale: { status: 'COMPLETED', saleDate: { gte: startOfDay, lte: endOfDay } },
      },
      select: {
        quantity: true,
        unitPrice: true,
        total: true,
        product: { select: { costPrice: true } },
      },
    }),
    // 3. Ventas del mes actual
    prisma.sale.aggregate({
      where: { status: 'COMPLETED', saleDate: { gte: startOfMonth } },
      _count: { id: true },
      _sum: { total: true },
    }),
    // 4. Ingresos de hoy en caja (no crédito)
    prisma.sale.aggregate({
      where: {
        status: 'COMPLETED',
        saleDate: { gte: startOfDay, lte: endOfDay },
        paymentMethod: { not: 'CREDITO' },
      },
      _sum: { total: true },
    }),
    // 5. Abonos de créditos recibidos hoy en caja
    prisma.payment.aggregate({
      where: { paymentDate: { gte: startOfDay, lte: endOfDay } },
      _sum: { amount: true },
    }),
    // 6. Ventas a crédito para cálculo de cartera pendiente
    prisma.sale.findMany({
      where: { paymentMethod: 'CREDITO', status: 'COMPLETED' },
      select: {
        clientId: true,
        total: true,
        payments: { select: { amount: true } },
      },
    }),
    // 7. Pedidos web pendientes (conteo)
    prisma.webOrder.count({
      where: { status: 'PENDING' },
    }),
    // 8. Monto total de pedidos web pendientes
    prisma.webOrder.aggregate({
      where: { status: 'PENDING' },
      _sum: { total: true },
    }),
    // 9. Lista de pedidos web pendientes
    prisma.webOrder.findMany({
      where: { status: 'PENDING' },
      orderBy: { createdAt: 'desc' },
      take: 5,
      select: {
        id: true,
        reference: true,
        customerName: true,
        customerPhone: true,
        total: true,
        createdAt: true,
      },
    }),
    // 10. Productos con stock bajo (críticos)
    prisma.$queryRaw<Array<{ id: string; name: string; stock: number; lowStockThreshold: number; salePrice: number }>>`
      SELECT id, name, stock, "lowStockThreshold", "salePrice"
      FROM products
      WHERE "deletedAt" IS NULL
        AND stock <= "lowStockThreshold"
      ORDER BY stock ASC
      LIMIT 10
    `,
    // 11. Conteo REAL de todos los productos con stock bajo
    prisma.$queryRaw<Array<{ count: number }>>`
      SELECT COUNT(*)::int as count
      FROM products
      WHERE "deletedAt" IS NULL
        AND stock <= "lowStockThreshold"
    `,
    // 12. Total productos agotados (stock <= 0)
    prisma.product.count({
      where: { deletedAt: null, stock: { lte: 0 } },
    }),
    // 13. Total productos activos en catálogo
    prisma.product.count({ where: { deletedAt: null } }),
    // 14. Estadísticas de clientes
    getClientStats().catch(() => ({ totalClients: 0, newClientsThisMonth: 0 })),
    // 15. Ventas recientes
    prisma.sale.findMany({
      take: 7,
      orderBy: { saleDate: 'desc' },
      where: { status: 'COMPLETED' },
      select: {
        id: true,
        invoiceNumber: true,
        total: true,
        paymentMethod: true,
        saleDate: true,
        client: { select: { id: true, name: true } },
      },
    }),
    // 16. Ventas por mes (últimos 6 meses)
    prisma.sale.findMany({
      where: {
        status: 'COMPLETED',
        saleDate: {
          gte: new Date(now.getFullYear(), now.getMonth() - 5, 1),
        },
      },
      select: { saleDate: true, total: true },
      orderBy: { saleDate: 'asc' },
    }),
    // 17. Top productos más vendidos (últimos 30 días)
    prisma.saleItem.groupBy({
      by: ['productId'],
      where: {
        sale: {
          status: 'COMPLETED',
          saleDate: { gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) },
        },
      },
      _sum: { quantity: true, total: true },
      orderBy: { _sum: { quantity: 'desc' } },
      take: 6,
    }),
    // 18. Ventas por método de pago
    prisma.sale.groupBy({
      by: ['paymentMethod'],
      where: { status: 'COMPLETED' },
      _count: { id: true },
      _sum: { total: true },
      orderBy: { _sum: { total: 'desc' } },
    }),
  ])

  // Métricas de ventas hoy
  const salesCountToday = salesTodayData._count.id ?? 0
  const salesTotalToday = salesTodayData._sum.total ?? 0
  const averageTicketToday = salesCountToday > 0 ? Math.round(salesTotalToday / salesCountToday) : 0

  // Margen de ganancia hoy
  let profitToday = 0
  for (const item of salesTodayItems) {
    const cost = (item.product?.costPrice ?? 0) * item.quantity
    profitToday += item.total - cost
  }
  const cleanProfitToday = Math.max(0, profitToday)
  const profitMarginPercent = salesTotalToday > 0 ? Math.round((cleanProfitToday / salesTotalToday) * 100) : 0

  // Ingreso total recibido hoy en caja
  const incomeToday = (incomeTodaySales._sum.total ?? 0) + (incomeTodayPayments._sum.amount ?? 0)

  // Saldo de créditos pendientes y clientes morosos
  const debtors = new Set<string>()
  let pendingCreditTotal = 0
  for (const s of creditSales) {
    const paid = s.payments.reduce((acc, p) => acc + p.amount, 0)
    const remaining = s.total - paid
    if (remaining > 0) {
      pendingCreditTotal += remaining
      if (s.clientId) debtors.add(s.clientId)
    }
  }

  // Mapeo mensual continuo (6 meses consecutivos)
  const monthlyMap: Record<string, { month: string; total: number; count: number }> = {}
  for (let i = 5; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1)
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
    monthlyMap[key] = { month: key, total: 0, count: 0 }
  }
  for (const s of salesByMonthData) {
    const d = new Date(s.saleDate)
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
    if (monthlyMap[key]) {
      monthlyMap[key].total += s.total
      monthlyMap[key].count += 1
    }
  }
  const salesByMonth = Object.values(monthlyMap)

  // Mapeo top productos con nombres reales
  const topProductIds = topItemsGroup.map((t) => t.productId)
  const productNames = await prisma.product.findMany({
    where: { id: { in: topProductIds } },
    select: { id: true, name: true },
  })
  const productNameMap = new Map(productNames.map((p) => [p.id, p.name]))

  const topProducts = topItemsGroup.map((item) => ({
    productId: item.productId,
    quantity: item._sum.quantity ?? 0,
    total: item._sum.total ?? 0,
    name: productNameMap.get(item.productId) ?? 'Producto desconocido',
  }))

  const realLowStockCount = Number(lowStockTotalCountRaw[0]?.count ?? lowStockList.length)

  return {
    salesToday: {
      count: salesCountToday,
      total: salesTotalToday,
      profit: cleanProfitToday,
      averageTicket: averageTicketToday,
      profitMarginPercent,
    },
    salesThisMonth: {
      count: salesMonthData._count.id ?? 0,
      total: salesMonthData._sum.total ?? 0,
    },
    incomeToday,
    pendingCreditTotal,
    pendingCreditClientsCount: debtors.size,
    webOrdersSummary: {
      pendingCount: webOrdersPendingCount,
      pendingOrdersTotal: webOrdersPendingSum._sum.total ?? 0,
      pendingOrders: webPendingList,
    },
    inventorySummary: {
      totalProducts,
      lowStockCount: realLowStockCount,
      outOfStockCount,
      lowStockProducts: lowStockList,
    },
    clientStats: {
      totalClients: clientStats?.totalClients ?? 0,
      newClientsThisMonth: clientStats?.newClientsThisMonth ?? 0,
    },
    recentSales,
    salesByPayment: salesByPayment as Array<{
      paymentMethod: string
      _count: { id: number }
      _sum: { total: number | null }
    }>,
    salesByMonth,
    topProducts,
  }
}
