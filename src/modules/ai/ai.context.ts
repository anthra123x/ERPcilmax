import { prisma } from '@/lib/prisma'
import { formatCurrency } from '@/lib/format'

export interface BusinessSnapshot {
  company: {
    name: string
    storeName: string
    currency: string
    lowStockThreshold: number
    webPendingExpiryHours: number
  }
  salesToday: { count: number; total: number }
  salesThisMonth: { count: number; total: number }
  pendingCredit: { total: number; salesCount: number }
  inventory: {
    products: number
    units: number
    lowStockCount: number
    outOfStockCount: number
    lowStockTop: Array<{ name: string; stock: number; threshold: number; category: string | null }>
  }
  webOrders: Record<'PENDING' | 'CONFIRMED' | 'CONVERTED' | 'CANCELLED', number>
  clients: { total: number; newThisMonth: number }
  contactUnread: number
  webVisibleProducts: number
  askedAt: string
}

export function dateStartOfDay(): Date {
  const start = new Date()
  start.setHours(0, 0, 0, 0)
  return start
}

export function dateStartOfMonth(): Date {
  const start = new Date()
  start.setDate(1)
  start.setHours(0, 0, 0, 0)
  return start
}

export function dateDaysAgo(days: number): Date {
  const start = new Date()
  start.setDate(start.getDate() - days)
  start.setHours(0, 0, 0, 0)
  return start
}

export async function collectBusinessData(): Promise<BusinessSnapshot> {
  const [settings, storeSetting] = await Promise.all([
    prisma.systemSettings.findFirst({
      select: {
        companyName: true,
        currency: true,
        lowStockThreshold: true,
        webPendingExpiryHours: true,
      },
    }),
    prisma.storeSetting.findUnique({ where: { key: 'store' } }),
  ])

  const company = {
    name: settings?.companyName || 'Cilmax',
    storeName:
      typeof storeSetting?.value === 'object' &&
      storeSetting.value !== null &&
      (storeSetting.value as Record<string, unknown>).storeName
        ? String((storeSetting.value as Record<string, unknown>).storeName)
        : settings?.companyName || 'Cilmax',
    currency: settings?.currency || 'COP',
    lowStockThreshold: settings?.lowStockThreshold ?? 5,
    webPendingExpiryHours: settings?.webPendingExpiryHours ?? 24,
  }

  const dayStart = dateStartOfDay()
  const monthStart = dateStartOfMonth()

  const [salesTodayRows, salesMonthRows, creditRows, products, webOrders, clientsTotal, clientsNew, contactUnread, webVisible] =
    await Promise.all([
      prisma.sale.findMany({
        where: { status: 'COMPLETED', saleDate: { gte: dayStart } },
        select: { total: true },
      }),
      prisma.sale.findMany({
        where: { status: 'COMPLETED', saleDate: { gte: monthStart } },
        select: { total: true },
      }),
      prisma.sale.findMany({
        where: { paymentMethod: 'CREDITO', status: 'COMPLETED' },
        select: { total: true, payments: { select: { amount: true } } },
      }),
      prisma.product.findMany({
        where: { deletedAt: null },
        select: {
          name: true,
          stock: true,
          lowStockThreshold: true,
          costPrice: true,
          salePrice: true,
          category: { select: { name: true } },
        },
      }),
      prisma.webOrder.findMany({ select: { status: true } }),
      prisma.client.count({ where: { deletedAt: null } }),
      prisma.client.count({ where: { deletedAt: null, createdAt: { gte: monthStart } } }),
      prisma.contactMessage.count({ where: { read: false } }),
      prisma.product.count({ where: { deletedAt: null, webVisible: true } }),
    ])

  const salesTodayTotal = salesTodayRows.reduce((sum, s) => sum + s.total, 0)
  const salesMonthTotal = salesMonthRows.reduce((sum, s) => sum + s.total, 0)

  let creditTotal = 0
  for (const sale of creditRows) {
    const paid = sale.payments.reduce((sum, p) => sum + p.amount, 0)
    creditTotal += sale.total - paid
  }

  const lowStock = products
    .filter((p) => p.stock <= p.lowStockThreshold)
    .sort((a, b) => a.stock - b.stock)

  const webOrderCounts: BusinessSnapshot['webOrders'] = {
    PENDING: 0,
    CONFIRMED: 0,
    CONVERTED: 0,
    CANCELLED: 0,
  }
  for (const order of webOrders) {
    webOrderCounts[order.status] = (webOrderCounts[order.status] ?? 0) + 1
  }

  return {
    company,
    salesToday: { count: salesTodayRows.length, total: salesTodayTotal },
    salesThisMonth: { count: salesMonthRows.length, total: salesMonthTotal },
    pendingCredit: { total: creditTotal, salesCount: creditRows.length },
    inventory: {
      products: products.length,
      units: products.reduce((sum, p) => sum + p.stock, 0),
      lowStockCount: lowStock.length,
      outOfStockCount: lowStock.filter((p) => p.stock <= 0).length,
      lowStockTop: lowStock.slice(0, 10).map((p) => ({
        name: p.name,
        stock: p.stock,
        threshold: p.lowStockThreshold,
        category: p.category?.name ?? null,
      })),
    },
    webOrders: webOrderCounts,
    clients: { total: clientsTotal, newThisMonth: clientsNew },
    contactUnread,
    webVisibleProducts: webVisible,
    askedAt: new Date().toISOString(),
  }
}

export function businessSnapshotToText(snapshot: BusinessSnapshot): string {
  const cur = snapshot.company.currency
  const format = (n: number) => formatCurrency(n, cur)

  const lines = [
    `Empresa: ${snapshot.company.name}${snapshot.company.storeName !== snapshot.company.name ? ` | Tienda online: ${snapshot.company.storeName}` : ''}`,
    `Fecha de los datos: ${new Date(snapshot.askedAt).toLocaleString('es-CO', { dateStyle: 'medium', timeStyle: 'short' })}`,
    '',
    'Ventas:',
    `  • Hoy: ${snapshot.salesToday.count} ventas por ${format(snapshot.salesToday.total)}`,
    `  • Este mes: ${snapshot.salesThisMonth.count} ventas por ${format(snapshot.salesThisMonth.total)}`,
    `  • Crédito pendiente de cobro: ${format(snapshot.pendingCredit.total)} (${snapshot.pendingCredit.salesCount} ventas a crédito)`,
    '',
    'Inventario:',
    `  • ${snapshot.inventory.products} productos activos, ${snapshot.inventory.units} unidades en stock`,
    `  • ${snapshot.inventory.lowStockCount} productos con stock bajo (umbral <= ${snapshot.company.lowStockThreshold})`,
    `  • ${snapshot.inventory.outOfStockCount} productos agotados`,
    '  • Productos con stock bajo (top 10):',
    ...(snapshot.inventory.lowStockTop.length
      ? snapshot.inventory.lowStockTop.map((p) => `    - ${p.name}: ${p.stock} uds (mín ${p.threshold})${p.category ? ` - ${p.category}` : ''}`)
      : ['    (ninguno)']),
    '',
    'Tienda online:',
    `  • Pedidos: ${snapshot.webOrders.PENDING} pendientes, ${snapshot.webOrders.CONFIRMED} confirmados, ${snapshot.webOrders.CONVERTED} convertidos, ${snapshot.webOrders.CANCELLED} cancelados`,
    `  • Los pedidos pendientes se cancelan automáticamente tras ${snapshot.company.webPendingExpiryHours} horas sin confirmar`,
    `  • ${snapshot.webVisibleProducts} productos visibles en el catálogo web`,
    '',
    'Clientes:',
    `  • ${snapshot.clients.total} clientes registrados, ${snapshot.clients.newThisMonth} nuevos este mes`,
    `  • ${snapshot.contactUnread} mensajes de contacto sin leer`,
  ]

  return lines.join('\n')
}

export function buildSystemPrompt(snapshot: BusinessSnapshot): string {
  const cur = snapshot.company.currency

  return [
    'Eres el asistente virtual del sistema de gestión (ERP) de la empresa, enfocado en el negocio de tecnología y telecomunicaciones.',
    'Respondes en ESPAÑOL neutro, de forma breve, clara y profesional. Hablas de tú al dueño.',
    '',
    `Moneda: ${cur}. Todas las cantidades deben expresarse con el formato de moneda local.`,
    '',
    'CONTEXTO ACTUAL DEL NEGOCIO (datos reales de la base de datos, no inventados):',
    businessSnapshotToText(snapshot),
    '',
    'Reglas de negocio que debes respetar al responder:',
    '1. El stock de un producto es la única fuente de verdad; no lo inventes.',
    '2. Una venta solo pesa en ingresos si su estado es completada (COMPLETED).',
    '3. Los productos y clientes eliminados no cuentan en ningún resumen.',
    '4. Los pedidos de la tienda online nacen pendientes (PENDING) y se confirman manualmente; el stock se descuenta al confirmar.',
    '5. Puedes referir al usuario a las secciones del sistema (Ventas, Inventario, Tienda online, Reportes) cuando una acción requiera su intervención.',
    '',
    'FORMATO DE RESPUESTA:',
    'Debes responder SIEMPRE en una sola línea con JSON válido, sin texto fuera del JSON. Dos opciones:',
    '1. Si la pregunta se responde con el contexto actual o con conocimientos generales: {"text": "tu respuesta breve en español"}',
    '2. Si necesitas datos vivos más detallados (ej. lista de productos agotados, detalle de pedidos, últimas ventas): {"tool": "nombre_de_la_herramienta", "args": {}}',
    'Herramientas disponibles:',
    '  - get_sales_summary: estadísticas de ventas por período (args: period en "today","7d","30d","this_month","this_year").',
    '  - get_inventory_status: inventario, productos con stock bajo y agotados, valor del stock.',
    '  - get_web_orders_status: pedidos de la tienda online por estado y pendientes más antiguos.',
    '  - get_recent_sales: últimas ventas (args: limit, número entero, por defecto 5).',
    '  - get_client_summary: clientes, nuevos del mes y mayores compradores.',
    '  - get_pending_credit: créditos pendientes de cobro.',
    '  - get_contact_messages: mensajes de contacto y reseñas recientes.',
    '  - get_finance_summary: ingresos vs gastos del mes.',
    '  - get_business_snapshot: vista general actualizada completo.',
    '',
    'Nunca inventes cifras ni afirmes datos que no vengan de fuentes confiables. Si no tienes el dato, dilo y sugiere dónde consultarlo.',
  ]
    .join('\n')
}