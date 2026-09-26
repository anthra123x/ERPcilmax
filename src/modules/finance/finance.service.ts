/**
 * finance.service.ts
 * ─────────────────────────────────────────────────────────────────────────────
 * Barrel de re-exportaciones. Este archivo se mantiene por compatibilidad con
 * los imports existentes en finance.actions.ts y finance.expenses.ts.
 *
 * La lógica ha sido movida a los servicios especializados:
 *   - finance-budget.service.ts   → periodos de presupuesto semanal
 *   - finance-daily.service.ts    → resumen diario de transacciones
 *   - finance-categories.service.ts → CRUD categorías, transacciones, metas de ahorro
 *   - finance-reports.service.ts  → reportes mensuales y del negocio
 * ─────────────────────────────────────────────────────────────────────────────
 */

export { getWeekPeriod, getOrCreateActivePeriod, getPeriodById, getClosedPeriods, getPeriodTotals, getPeriodSummary, closeCurrentPeriod } from './finance-budget.service'
export type { PeriodSummary } from './finance-budget.service'

export { getDailySummary } from './finance-daily.service'
export type { DailySummary } from './finance-daily.service'

export {
  getCategories,
  getCategoryById,
  createCategory,
  updateCategory,
  deleteCategory,
  getTransactions,
  getTransactionById,
  createTransaction,
  updateTransaction,
  deleteTransaction,
  getSavingGoals,
  createSavingGoal,
  updateSavingGoal,
  deleteSavingGoal,
  autoGenerateRecurringExpenses,
} from './finance-categories.service'
export type { TransactionFilters } from './finance-categories.service'

export { getFinanceSummary, getBusinessFinanceReport, getFinancePeriodRange } from './finance-reports.service'
export type { FinanceSummary, BusinessFinanceReport, FinancePeriodKind } from './finance-reports.service'
