'use server'

import { prisma } from '@/lib/prisma'
import { revalidatePath } from 'next/cache'
import { requireAdmin, requireAuth } from '@/modules/auth/auth.actions'
import * as XLSX from 'xlsx'

export async function exportData() {
  await requireAuth()
  try {
    const [products, sales, clients] = await Promise.all([
      prisma.product.findMany({ where: { deletedAt: null }, include: { category: true, supplier: true } }),
      prisma.sale.findMany({ include: { items: { include: { product: true } }, client: true } }),
      prisma.client.findMany({ where: { deletedAt: null } }),
    ])

    const workbook = XLSX.utils.book_new()

    XLSX.utils.book_append_sheet(
      workbook,
      XLSX.utils.json_to_sheet(
        products.map((p) => ({
          ID: p.id,
          Nombre: p.name,
          Descripción: p.description || '',
          Categoría: p.category?.name || '',
          Proveedor: p.supplier?.name || '',
          Costo: p.costPrice,
          'Precio Venta': p.salePrice,
          Stock: p.stock,
        })),
      ),
      'Productos',
    )

    XLSX.utils.book_append_sheet(
      workbook,
      XLSX.utils.json_to_sheet(
        sales.map((s) => ({
          ID: s.id,
          'No. Factura': s.invoiceNumber,
          Cliente: s.client?.name || 'Consumidor final',
          Subtotal: s.subtotal,
          Descuento: s.discount,
          Total: s.total,
          'Método de Pago': s.paymentMethod,
          Estado: s.status,
          Fecha: new Date(s.saleDate).toISOString(),
        })),
      ),
      'Ventas',
    )

    XLSX.utils.book_append_sheet(
      workbook,
      XLSX.utils.json_to_sheet(
        clients.map((c) => ({
          ID: c.id,
          Nombre: c.name,
          Teléfono: c.phone || '',
          Email: c.email || '',
          Dirección: c.address || '',
          Fecha: new Date(c.createdAt).toISOString(),
        })),
      ),
      'Clientes',
    )

    const base64 = XLSX.write(workbook, { type: 'base64', bookType: 'xlsx' })
    const ts = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19)

    return { success: true, data: base64, filename: `backup_${ts}.xlsx` }
  } catch {
    return { success: false, error: 'Error al exportar datos' }
  }
}

export async function cleanupAll() {
  await requireAdmin()

  // Protección crítica: Bloquear borrado total de la base de datos en entorno de producción
  if (process.env.NODE_ENV === 'production') {
    return { error: 'Operación deshabilitada en producción por motivos de seguridad e integridad de datos.' }
  }

  try {
    await prisma.$transaction(async (tx) => {
      await tx.saleItem.deleteMany({})
      await tx.sale.deleteMany({})
      await tx.stockMovement.deleteMany({})
      await tx.product.deleteMany({})
      await tx.client.deleteMany({})
    })

    revalidatePath('/inventory')
    revalidatePath('/clients')
    revalidatePath('/sales')
    revalidatePath('/admin')
    revalidatePath('/dashboard')

    return { success: 'Limpieza completa del sistema ejecutada exitosamente' }
  } catch {
    return { error: 'Error al limpiar el sistema' }
  }
}
