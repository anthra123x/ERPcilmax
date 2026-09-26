'use server'

/**
 * web-content.actions.ts
 * Mensajes de contacto, reseñas de productos y settings de la tienda online.
 */
import { revalidatePath } from 'next/cache'
import { prisma } from '@/lib/prisma'
import { requireAuth } from '@/modules/auth/auth.actions'
import { parseError } from '@/lib/errors'
import { getNumber, getString } from '@/lib/form-data'
import { UpdateWebSettingsSchema } from '@/lib/validations'
import { getWebSettings } from './web.service'

// ─── Mensajes de contacto ────────────────────────────────────────────────────

export async function getAdminWebMessages() {
  await requireAuth()

  return await prisma.contactMessage.findMany({
    orderBy: { createdAt: 'desc' },
    select: { id: true, name: true, phone: true, email: true, message: true, read: true, createdAt: true },
  })
}

export async function setWebMessageRead(id: string, read: boolean) {
  await requireAuth()
  try {
    await prisma.contactMessage.update({ where: { id }, data: { read } })
    revalidatePath('/web/messages')
    revalidatePath('/web')
    return { success: read ? 'Mensaje marcado como leído' : 'Mensaje marcado como no leído' }
  } catch (error) {
    return { error: parseError(error).message }
  }
}

export async function deleteWebMessage(id: string) {
  await requireAuth()
  try {
    await prisma.contactMessage.delete({ where: { id } })
    revalidatePath('/web/messages')
    revalidatePath('/web')
    return { success: 'Mensaje eliminado' }
  } catch (error) {
    return { error: parseError(error).message }
  }
}

// ─── Reseñas ─────────────────────────────────────────────────────────────────

export async function getAdminWebReviews() {
  await requireAuth()

  return await prisma.productReview.findMany({
    orderBy: { createdAt: 'desc' },
    select: {
      id: true,
      product: { select: { id: true, name: true, slug: true, webVisible: true, deletedAt: true } },
      name: true,
      email: true,
      rating: true,
      comment: true,
      approved: true,
      createdAt: true,
    },
  })
}

export async function setWebReviewApproved(id: string, approved: boolean) {
  await requireAuth()
  try {
    await prisma.productReview.update({ where: { id }, data: { approved } })
    revalidatePath('/web/reviews')
    revalidatePath('/web')
    return { success: approved ? 'Reseña publicada' : 'Reseña ocultada' }
  } catch (error) {
    return { error: parseError(error).message }
  }
}

export async function deleteWebReview(id: string) {
  await requireAuth()
  try {
    await prisma.productReview.delete({ where: { id } })
    revalidatePath('/web/reviews')
    revalidatePath('/web')
    return { success: 'Reseña eliminada' }
  } catch (error) {
    return { error: parseError(error).message }
  }
}

// ─── Settings de la tienda ───────────────────────────────────────────────────

export async function getAdminWebSettings() {
  await requireAuth()

  const [webSettings, systemSettings] = await Promise.all([getWebSettings(), prisma.systemSettings.findFirst()])
  return {
    ...webSettings,
    webPendingExpiryHours: systemSettings?.webPendingExpiryHours ?? 24,
  }
}

export async function updateWebSettings(formData: FormData) {
  await requireAuth()

  const parsed = UpdateWebSettingsSchema.safeParse({
    storeName: getString(formData, 'storeName') || '',
    whatsapp: getString(formData, 'whatsapp') || '',
    email: getString(formData, 'email') || '',
    shippingInfo: getString(formData, 'shippingInfo') || '',
    webPendingExpiryHours: getNumber(formData, 'webPendingExpiryHours') ?? 24,
    primaryColor: getString(formData, 'primaryColor') || '#008a93',
    goldColor: getString(formData, 'goldColor') || '#d4af37',
  })

  if (!parsed.success) {
    return { error: parsed.error.issues.map((e) => e.message).join(', ') }
  }

  const d = parsed.data

  try {
    await prisma.$transaction([
      prisma.storeSetting.upsert({
        where: { key: 'store' },
        create: { key: 'store', value: { storeName: d.storeName, shippingInfo: d.shippingInfo || null } },
        update: { value: { storeName: d.storeName, shippingInfo: d.shippingInfo || null } },
      }),
      prisma.storeSetting.upsert({
        where: { key: 'whatsapp' },
        create: { key: 'whatsapp', value: { number: d.whatsapp } },
        update: { value: { number: d.whatsapp } },
      }),
      prisma.storeSetting.upsert({
        where: { key: 'contact' },
        create: { key: 'contact', value: { email: d.email } },
        update: { value: { email: d.email } },
      }),
      prisma.storeSetting.upsert({
        where: { key: 'theme' },
        create: { key: 'theme', value: { primaryColor: d.primaryColor, goldColor: d.goldColor } },
        update: { value: { primaryColor: d.primaryColor, goldColor: d.goldColor } },
      }),
    ])

    const existing = await prisma.systemSettings.findFirst()
    if (existing) {
      await prisma.systemSettings.update({
        where: { id: existing.id },
        data: { webPendingExpiryHours: d.webPendingExpiryHours },
      })
    } else {
      await prisma.systemSettings.create({ data: { webPendingExpiryHours: d.webPendingExpiryHours } })
    }
  } catch (error) {
    return { error: parseError(error, 'No se pudieron guardar los ajustes').message }
  }

  revalidatePath('/web/settings')
  revalidatePath('/web')
  return { success: 'Ajustes de la tienda guardados' }
}
