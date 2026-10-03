'use server'

import { supabase, createSupabaseServerAction } from '@/lib/supabase-server'
import { prisma } from '@/lib/prisma'
import { redirect } from 'next/navigation'
import { revalidatePath } from 'next/cache'
import { parseError } from '@/lib/errors'
import { randomBytes } from 'node:crypto'
import type { BusinessSector } from '@/lib/business-workflow'

export async function ensureUserExists(email: string, name: string) {
  try {
    await prisma.user.upsert({
      where: { email },
      update: { name },
      create: {
        email,
        name,
      },
    })

    return { success: true }
  } catch (error) {
    return { error: 'Error al verificar usuario' }
  }
}

export async function logout() {
  await supabase.auth.signOut()
  revalidatePath('/login')
  redirect('/login')
}

export async function getCurrentUser() {
  try {
    const supabase = await createSupabaseServerAction()

    const {
      data: { user },
      error: _error,
    } = await supabase.auth.getUser()

    if (_error || !user) {
      return null
    }

    const dbUser = await prisma.user.findUnique({
      where: { email: user.email },
      select: {
        id: true,
        email: true,
        name: true,
        createdAt: true,
      },
    })

    if (!dbUser && user.email) {
      try {
        const autoCreated = await prisma.user.upsert({
          where: { email: user.email },
          update: {},
          create: {
            email: user.email,
            name: (user.user_metadata?.name as string) || user.email.split('@')[0] || 'Usuario',
          },
          select: {
            id: true,
            email: true,
            name: true,
            createdAt: true,
          },
        })
        return {
          ...autoCreated,
          name: autoCreated.name || user.email.split('@')[0] || 'Usuario',
        }
      } catch {
        return {
          id: user.id,
          email: user.email,
          name: (user.user_metadata?.name as string) || user.email.split('@')[0] || 'Usuario',
          createdAt: new Date(),
        }
      }
    }

    if (!dbUser) {
      return null
    }

    return {
      ...dbUser,
      name: dbUser.name || (user.user_metadata?.name as string) || user.email?.split('@')[0] || 'Usuario',
    }
  } catch (_error) {
    try {
      const supabase = await createSupabaseServerAction()
      const {
        data: { user },
      } = await supabase.auth.getUser()
      if (user && user.email) {
        return {
          id: user.id,
          email: user.email,
          name: (user.user_metadata?.name as string) || user.email.split('@')[0] || 'Usuario',
          createdAt: new Date(),
        }
      }
    } catch {
      // Continuar retorno null
    }
    return null
  }
}

export async function requireAuth() {
  const user = await getCurrentUser()

  if (!user) {
    redirect('/login')
  }

  return user
}

export async function requireAdmin() {
  const user = await requireAuth()

  try {
    const supabase = await createSupabaseServerAction()
    const {
      data: { user: sbUser },
    } = await supabase.auth.getUser()

    const role =
      (sbUser?.user_metadata?.roleTitle as string | undefined) ||
      (sbUser?.app_metadata?.role as string | undefined) ||
      'Administrador'

    const isRestrictedRole =
      typeof role === 'string' &&
      (role.toLowerCase().includes('vendedor') ||
        role.toLowerCase().includes('cajero') ||
        role.toLowerCase().includes('empleado'))

    if (isRestrictedRole) {
      throw new Error('Acceso no autorizado: se requieren permisos de administrador')
    }
  } catch (err) {
    if (err instanceof Error && err.message.includes('Acceso no autorizado')) {
      throw err
    }
  }

  return user
}

export async function updatePassword(newPassword: string) {
  await requireAuth()

  try {
    const supabase = await createSupabaseServerAction()
    const { error } = await supabase.auth.updateUser({ password: newPassword })

    if (error) {
      return { error: 'No se pudo actualizar la contraseña. Intenta iniciar sesión nuevamente.' }
    }

    return { success: true }
  } catch (_error) {
    return { error: 'Error inesperado al actualizar la contraseña' }
  }
}

export async function updateProfileName(name: string) {
  await requireAuth()

  const trimmedName = name?.trim()
  if (!trimmedName) {
    return { error: 'El nombre es obligatorio' }
  }

  try {
    const client = await createSupabaseServerAction()

    const {
      data: { user },
    } = await client.auth.getUser()

    if (!user?.email) {
      return { error: 'Sesión no válida' }
    }

    await prisma.user.update({
      where: { email: user.email },
      data: { name: trimmedName },
    })

    if (process.env.SUPABASE_SERVICE_ROLE_KEY) {
      const { supabaseAdmin } = await import('@/lib/supabase-server')
      await supabaseAdmin.auth.admin.updateUserById(user.id, {
        user_metadata: { ...(user.user_metadata || {}), name: trimmedName },
      })
    }

    revalidatePath('/profile')
    return { success: 'Perfil actualizado' }
  } catch (_error) {
    return { error: 'Error al actualizar el perfil' }
  }
}

export async function updateUserProfile(data: {
  name: string
  phone?: string
  roleTitle?: string
}) {
  await requireAuth()

  const trimmedName = data.name?.trim()
  if (!trimmedName) {
    return { error: 'El nombre es obligatorio' }
  }

  try {
    const client = await createSupabaseServerAction()

    const {
      data: { user },
    } = await client.auth.getUser()

    if (!user?.email) {
      return { error: 'Sesión no válida' }
    }

    await prisma.user.update({
      where: { email: user.email },
      data: { name: trimmedName },
    })

    if (process.env.SUPABASE_SERVICE_ROLE_KEY) {
      const { supabaseAdmin } = await import('@/lib/supabase-server')
      await supabaseAdmin.auth.admin.updateUserById(user.id, {
        user_metadata: {
          ...(user.user_metadata || {}),
          name: trimmedName,
          phone: data.phone?.trim() || null,
          roleTitle: data.roleTitle?.trim() || 'Administrador',
        },
      })
    }

    revalidatePath('/profile')
    return { success: 'Perfil actualizado exitosamente' }
  } catch (_error) {
    return { error: 'Error al actualizar el perfil' }
  }
}

export async function requestPasswordReset(email: string) {
  const trimmedEmail = email?.trim()
  if (!trimmedEmail) {
    return { error: 'Ingresa tu correo electrónico' }
  }

  try {
    const appUrl = process.env.NEXTAUTH_URL || process.env.APP_URL || process.env.NEXT_PUBLIC_APP_URL
    let origin = appUrl
    if (!origin) {
      const { headers } = await import('next/headers')
      const headerStore = await headers()
      const host = headerStore.get('host') || 'localhost:3000'
      const allowedHosts = ['localhost:3000', '127.0.0.1:3000', 'erpcilmax.vercel.app', 'cilmax.store']
      const isAllowed = allowedHosts.includes(host) || host.endsWith('.vercel.app')
      const safeHost = isAllowed ? host : 'erpcilmax.vercel.app'
      const protocol = headerStore.get('x-forwarded-proto') || (safeHost.includes('localhost') ? 'http' : 'https')
      origin = `${protocol}://${safeHost}`
    }

    const client = await createSupabaseServerAction()

    const { error } = await client.auth.resetPasswordForEmail(trimmedEmail, {
      redirectTo: `${origin}/auth/update-password`,
    })

    if (error) {
      console.error('requestPasswordReset error:', error.message)
      return { error: 'No se pudo enviar el correo de recuperación. Inténtalo de nuevo.' }
    }

    return { success: 'Si el correo está registrado, recibirás un enlace para restablecer tu contraseña.' }
  } catch (_error) {
    return { error: 'Error inesperado al solicitar el restablecimiento' }
  }
}

export async function getUsers() {
  await requireAdmin()
  return await prisma.user.findMany({
    select: {
      id: true,
      email: true,
      name: true,
      createdAt: true,
    },
    orderBy: {
      createdAt: 'desc',
    },
  })
}

export async function deleteUser(userId: string) {
  const currentUser = await requireAdmin()

  // Prevenir que un admin se elimine a sí mismo (quedaría sin acceso al sistema).
  if (userId === currentUser.id) {
    return { error: 'No puedes eliminar tu propio usuario' }
  }

  try {
    await prisma.user.delete({
      where: { id: userId },
    })

    revalidatePath('/admin')
    return {
      success: 'Usuario eliminado exitosamente',
    }
  } catch (error) {
    if (parseError(error).code === 'P2025') {
      return { error: 'Usuario no encontrado' }
    }
    return { error: 'Error al eliminar usuario' }
  }
}

export async function createUserByAdmin(formData: FormData) {
  await requireAdmin()

  const email = formData.get('email') as string
  const name = formData.get('name') as string
  const password = formData.get('password') as string | null

  if (!email || !name) {
    return { error: 'Todos los campos son requeridos' }
  }

  if (password && password.length < 6) {
    return { error: 'La contraseña debe tener al menos 6 caracteres' }
  }

  try {
    try {
      await prisma.user.create({
        data: { email, name },
      })
    } catch (error) {
      if (parseError(error).code === 'P2002') {
        return { error: 'El usuario ya existe' }
      }
      throw error
    }

    const finalPassword = password || randomBytes(16).toString('base64url')
    const { error: authError } = await supabase.auth.admin.createUser({
      email,
      password: finalPassword,
      email_confirm: true,
      user_metadata: { name },
    })

    if (authError) {
      await prisma.user.delete({ where: { email } }).catch(() => {})
      return { error: authError.message }
    }

    revalidatePath('/admin')

    if (password) {
      return {
        success: 'Usuario creado exitosamente. La contraseña fue asignada.',
      }
    }

    return {
      success: `Usuario creado exitosamente. Contraseña temporal: ${finalPassword}. Comunícala de forma segura.`,
    }
  } catch (error) {
    console.error('createUserByAdmin error:', error)
    return { error: 'Error al crear usuario' }
  }
}

export interface RegisterCompanyInput {
  name: string
  email: string
  password: string
  companyName: string
  sector?: BusinessSector
  slogan?: string
  logoUrl?: string | null
  companyNit?: string
  companyCity?: string
  companyPhone?: string
  currency?: string
}

export async function registerCompanyAndOwnerAction(data: RegisterCompanyInput) {
  const {
    name,
    email,
    password,
    companyName,
    sector = 'retail_general',
    slogan,
    logoUrl,
    companyNit,
    companyCity,
    companyPhone,
    currency = 'COP',
  } = data

  const trimmedEmail = email?.trim().toLowerCase()
  const trimmedName = name?.trim()
  const trimmedCompany = companyName?.trim()

  if (!trimmedEmail || !trimmedName || !trimmedCompany) {
    return { error: 'Nombre, correo y nombre comercial son obligatorios' }
  }

  if (!password || password.length < 6) {
    return { error: 'La contraseña debe tener al menos 6 caracteres' }
  }

  try {
    // 1. Registrar o actualizar en la base de datos local
    await prisma.user.upsert({
      where: { email: trimmedEmail },
      update: { name: trimmedName },
      create: { email: trimmedEmail, name: trimmedName },
    })

    // 2. Crear usuario en Supabase Auth
    if (process.env.SUPABASE_SERVICE_ROLE_KEY) {
      const { supabaseAdmin } = await import('@/lib/supabase-server')
      const { error: sbError } = await supabaseAdmin.auth.admin.createUser({
        email: trimmedEmail,
        password,
        email_confirm: true,
        user_metadata: {
          name: trimmedName,
          companyName: trimmedCompany,
          roleTitle: 'Administrador Propietario',
        },
      })
      if (sbError && !sbError.message.toLowerCase().includes('already registered')) {
        return { error: sbError.message }
      }
    } else {
      const { error: signUpError } = await supabase.auth.signUp({
        email: trimmedEmail,
        password,
        options: {
          data: {
            name: trimmedName,
            companyName: trimmedCompany,
            roleTitle: 'Administrador Propietario',
          },
        },
      })
      if (signUpError && !signUpError.message.toLowerCase().includes('already registered')) {
        return { error: signUpError.message }
      }
    }

    // 3. Inicializar parámetros comerciales en SystemSettings
    const { updateSettings } = await import('@/modules/settings/settings.service')
    const { SECTOR_INFO } = await import('@/lib/business-workflow')
    const sectorInfo = SECTOR_INFO[sector] || SECTOR_INFO.retail_general

    await updateSettings({
      companyName: trimmedCompany,
      companyNit: companyNit || null,
      companyAddress: null,
      companyCity: companyCity || null,
      companyPhone: companyPhone || null,
      companyEmail: trimmedEmail,
      currency: currency || 'COP',
      invoicePrefix: 'FAC-',
      invoiceFooter: sectorInfo.defaultFooter,
    })

    // 4. Inicializar flujos de trabajo en StoreSetting
    const { updateBusinessWorkflowConfig } = await import('@/modules/settings/settings.service')
    await updateBusinessWorkflowConfig({
      sector,
      slogan: slogan || sectorInfo.description,
      logoUrl: logoUrl || null,
      defaultProfitMargin: sectorInfo.suggestedMargin,
      allowCreditSales: true,
      requireClientOnSale: false,
      allowNegativeStock: false,
      allowCashierDiscounts: true,
      barcodeContinuousScan: true,
    })

    revalidatePath('/admin')
    revalidatePath('/sales/new')
    revalidatePath('/dashboard')

    return {
      success: true,
      email: trimmedEmail,
    }
  } catch (error) {
    console.error('registerCompanyAndOwnerAction error:', error)
    return { error: error instanceof Error ? error.message : 'Error al registrar la empresa' }
  }
}

