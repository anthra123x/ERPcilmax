'use server'

import { revalidatePath } from 'next/cache'
import { requireAuth } from '@/modules/auth/auth.actions'
import { parseError } from '@/lib/errors'
import {
  CreateCategorySchema,
  UpdateCategorySchema,
  CreateTransactionSchema,
  UpdateTransactionSchema,
  CreateSavingGoalSchema,
  UpdateSavingGoalSchema,
} from '@/lib/validations'
import {
  getCategories,
  createCategory,
  updateCategory,
  deleteCategory,
  getTransactions,
  createTransaction,
  updateTransaction,
  deleteTransaction,
  getFinanceSummary,
  getSavingGoals,
  createSavingGoal,
  updateSavingGoal,
  deleteSavingGoal,
  autoGenerateRecurringExpenses,
  getDailySummary,
  getPeriodSummary,
  getOrCreateActivePeriod,
  closeCurrentPeriod,
  getClosedPeriods,
  getBusinessFinanceReport,
} from './finance.service'

export async function getFinanceCategories(type?: string) {
  await requireAuth()
  return await getCategories(type)
}

export async function createCategoryAction(formData: FormData) {
  await requireAuth()
  const raw = {
    name: formData.get('name') as string,
    type: formData.get('type') as string,
    color: (formData.get('color') as string) || null,
    icon: (formData.get('icon') as string) || null,
    budget: formData.get('budget') ? Number(formData.get('budget')) : null,
  }
  const parsed = CreateCategorySchema.safeParse(raw)
  if (!parsed.success) return { error: parsed.error.issues[0].message }

  try {
    await createCategory(parsed.data)
    revalidatePath('/finances/categories')
    return { success: 'Categoría creada exitosamente' }
  } catch (error) {
    return { error: parseError(error).message }
  }
}

export async function updateCategoryAction(categoryId: string, formData: FormData) {
  await requireAuth()
  const raw = {
    name: (formData.get('name') as string) || undefined,
    type: (formData.get('type') as string) || undefined,
    color: (formData.get('color') as string) || null,
    icon: (formData.get('icon') as string) || null,
    budget: formData.get('budget') ? Number(formData.get('budget')) : null,
  }
  const parsed = UpdateCategorySchema.safeParse(raw)
  if (!parsed.success) return { error: parsed.error.issues[0].message }

  try {
    const data = parsed.data
    const updateData: Record<string, unknown> = {}
    if (data.name !== undefined) updateData.name = data.name
    if (data.type !== undefined) updateData.type = data.type
    if (data.color !== undefined) updateData.color = data.color
    if (data.icon !== undefined) updateData.icon = data.icon
    if (data.budget !== undefined) updateData.budget = data.budget

    await updateCategory(categoryId, updateData as Parameters<typeof updateCategory>[1])
    revalidatePath('/finances/categories')
    return { success: 'Categoría actualizada exitosamente' }
  } catch (error) {
    return { error: parseError(error).message }
  }
}

export async function deleteCategoryAction(categoryId: string) {
  await requireAuth()
  try {
    await deleteCategory(categoryId)
    revalidatePath('/finances/categories')
    return { success: 'Categoría eliminada exitosamente' }
  } catch (error) {
    return { error: parseError(error).message }
  }
}

export async function getTransactionsAction(filters?: {
  type?: 'INCOME' | 'EXPENSE'
  categoryId?: string
  startDate?: string
  endDate?: string
  page?: number
  pageSize?: number
}) {
  await requireAuth()
  return await getTransactions(filters)
}

export async function createTransactionAction(formData: FormData) {
  await requireAuth()
  const raw = {
    type: formData.get('type') as string,
    amount: formData.get('amount') as string,
    description: formData.get('description') as string,
    date: (formData.get('date') as string) || undefined,
    categoryId: formData.get('categoryId') as string,
    isRecurring: formData.get('isRecurring') === 'true',
    recurringDay: formData.get('recurringDay') ? Number(formData.get('recurringDay')) : null,
    notes: (formData.get('notes') as string) || null,
  }
  const parsed = CreateTransactionSchema.safeParse(raw)
  if (!parsed.success) return { error: parsed.error.issues[0].message }

  try {
    await createTransaction(parsed.data)
    revalidatePath('/finances/transactions')
    revalidatePath('/finances')
    return { success: 'Transacción creada exitosamente' }
  } catch (error) {
    return { error: parseError(error).message }
  }
}

export async function updateTransactionAction(transactionId: string, formData: FormData) {
  await requireAuth()
  const raw: Record<string, unknown> = {}
  const type = formData.get('type') as string | null
  if (type) raw.type = type
  const amount = formData.get('amount') as string | null
  if (amount) raw.amount = amount
  const description = formData.get('description') as string | null
  if (description) raw.description = description
  const date = formData.get('date') as string | null
  if (date) raw.date = date
  const categoryId = formData.get('categoryId') as string | null
  if (categoryId) raw.categoryId = categoryId
  const isRecurring = formData.get('isRecurring') as string | null
  if (isRecurring) raw.isRecurring = isRecurring === 'true'
  const recurringDay = formData.get('recurringDay') as string | null
  if (recurringDay) raw.recurringDay = Number(recurringDay)
  const notes = formData.get('notes') as string | null
  if (notes !== null) raw.notes = notes || null

  const parsed = UpdateTransactionSchema.safeParse(raw)
  if (!parsed.success) return { error: parsed.error.issues[0].message }

  try {
    await updateTransaction(transactionId, parsed.data)
    revalidatePath('/finances/transactions')
    revalidatePath('/finances')
    return { success: 'Transacción actualizada exitosamente' }
  } catch (error) {
    return { error: parseError(error).message }
  }
}

export async function deleteTransactionAction(transactionId: string) {
  await requireAuth()
  try {
    await deleteTransaction(transactionId)
    revalidatePath('/finances/transactions')
    revalidatePath('/finances')
    return { success: 'Transacción eliminada exitosamente' }
  } catch (error) {
    return { error: parseError(error).message }
  }
}

export async function getFinanceSummaryAction(dateStr?: string) {
  await requireAuth()
  await autoGenerateRecurringExpenses()
  return await getFinanceSummary(dateStr)
}

export async function getBusinessFinanceReportAction(kind: 'day' | 'week' | 'month', dateStr?: string) {
  await requireAuth()
  return await getBusinessFinanceReport(kind, dateStr)
}

export async function getSavingGoalsAction() {
  await requireAuth()
  return await getSavingGoals()
}

export async function createSavingGoalAction(formData: FormData) {
  await requireAuth()
  const raw = {
    name: formData.get('name') as string,
    targetAmount: formData.get('targetAmount') as string,
    currentAmount: (formData.get('currentAmount') as string) || '0',
    deadline: (formData.get('deadline') as string) || null,
    categoryId: (formData.get('categoryId') as string) || null,
  }
  const parsed = CreateSavingGoalSchema.safeParse(raw)
  if (!parsed.success) return { error: parsed.error.issues[0].message }

  try {
    await createSavingGoal(parsed.data)
    revalidatePath('/finances/goals')
    revalidatePath('/finances')
    return { success: 'Meta de ahorro creada exitosamente' }
  } catch (error) {
    return { error: parseError(error).message }
  }
}

export async function updateSavingGoalAction(goalId: string, formData: FormData) {
  await requireAuth()
  const raw: Record<string, unknown> = {}
  const name = formData.get('name') as string | null
  if (name) raw.name = name
  const targetAmount = formData.get('targetAmount') as string | null
  if (targetAmount) raw.targetAmount = targetAmount
  const currentAmount = formData.get('currentAmount') as string | null
  if (currentAmount) raw.currentAmount = currentAmount
  const deadline = formData.get('deadline') as string | null
  raw.deadline = deadline || null
  const categoryId = formData.get('categoryId') as string | null
  raw.categoryId = categoryId || null

  const parsed = UpdateSavingGoalSchema.safeParse(raw)
  if (!parsed.success) return { error: parsed.error.issues[0].message }

  try {
    await updateSavingGoal(goalId, parsed.data)
    revalidatePath('/finances/goals')
    revalidatePath('/finances')
    return { success: 'Meta de ahorro actualizada exitosamente' }
  } catch (error) {
    return { error: parseError(error).message }
  }
}

export async function deleteSavingGoalAction(goalId: string) {
  await requireAuth()
  try {
    await deleteSavingGoal(goalId)
    revalidatePath('/finances/goals')
    revalidatePath('/finances')
    return { success: 'Meta de ahorro eliminada exitosamente' }
  } catch (error) {
    return { error: parseError(error).message }
  }
}

// ─── Budget Period Actions ───

export async function getActivePeriodAction() {
  await requireAuth()
  return await getOrCreateActivePeriod()
}

export async function getPeriodSummaryAction(dateStr?: string, periodId?: string) {
  await requireAuth()
  return await getPeriodSummary(dateStr, periodId)
}

export async function getDailySummaryAction(dateStr?: string) {
  await requireAuth()
  return await getDailySummary(dateStr)
}

export async function getClosedPeriodsAction(limit = 10) {
  await requireAuth()
  return await getClosedPeriods(limit)
}

export async function closeWeekAction(formData: FormData) {
  await requireAuth()
  const savingsTarget = formData.get('savingsTarget') ? Number(formData.get('savingsTarget')) : undefined
  try {
    const result = await closeCurrentPeriod(savingsTarget)
    revalidatePath('/finances')
    revalidatePath('/finances/plan')
    return { success: `Semana cerrada exitosamente. Ahorro: $${result.savingsAmount.toLocaleString('es-CO')}` }
  } catch (error) {
    return { error: parseError(error).message }
  }
}
