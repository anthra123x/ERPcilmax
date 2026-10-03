'use client'

export type ThemeMode = 'light' | 'dark' | 'system'
export type AccentColor = 'emerald' | 'indigo' | 'violet' | 'amber' | 'slate'
export type TableDensity = 'normal' | 'compact'
export type DefaultModule = '/dashboard' | '/sales' | '/inventory' | '/web/orders'

export interface UserPreferences {
  theme: ThemeMode
  accentColor: AccentColor
  tableDensity: TableDensity
  defaultModule: DefaultModule
  posSound: boolean
  showAiAssistant: boolean
  stockAlerts: boolean
  webOrderAlerts: boolean
  phone?: string
  roleTitle?: string
}

export const PREFERENCES_STORAGE_KEY = 'nova_erp_user_preferences'
export const PREFERENCES_CHANGED_EVENT = 'nova_preferences_changed'

export const DEFAULT_PREFERENCES: UserPreferences = {
  theme: 'light',
  accentColor: 'emerald',
  tableDensity: 'normal',
  defaultModule: '/dashboard',
  posSound: true,
  showAiAssistant: true,
  stockAlerts: true,
  webOrderAlerts: true,
  phone: '',
  roleTitle: 'Administrador',
}

export const ACCENT_PALETTES: Record<
  AccentColor,
  {
    name: string
    description: string
    badgeClass: string
    avatarClass: string
    ringClass: string
    bgLightClass: string
    borderClass: string
    hex: string
  }
> = {
  emerald: {
    name: 'Verde Esmeralda',
    description: 'Insignia de Nova ERP, sobrio, equilibrado y confiable.',
    badgeClass: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20',
    avatarClass: 'bg-emerald-600 text-white shadow-emerald-500/20',
    ringClass: 'ring-emerald-500',
    bgLightClass: 'bg-emerald-50 dark:bg-emerald-950/30',
    borderClass: 'border-emerald-500/30',
    hex: '#059669',
  },
  indigo: {
    name: 'Azul Cobalto',
    description: 'Estilo tecnológico, analítico y corporativo moderno.',
    badgeClass: 'bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border-indigo-500/20',
    avatarClass: 'bg-indigo-600 text-white shadow-indigo-500/20',
    ringClass: 'ring-indigo-500',
    bgLightClass: 'bg-indigo-50 dark:bg-indigo-950/30',
    borderClass: 'border-indigo-500/30',
    hex: '#4f46e5',
  },
  violet: {
    name: 'Púrpura Imperial',
    description: 'Elegancia distintiva y diseño premium de alta gama.',
    badgeClass: 'bg-violet-500/10 text-violet-600 dark:text-violet-400 border-violet-500/20',
    avatarClass: 'bg-violet-600 text-white shadow-violet-500/20',
    ringClass: 'ring-violet-500',
    bgLightClass: 'bg-violet-50 dark:bg-violet-950/30',
    borderClass: 'border-violet-500/30',
    hex: '#7c3aed',
  },
  amber: {
    name: 'Ámbar Solar',
    description: 'Enérgico, dinámico y cálido para comercio minorista.',
    badgeClass: 'bg-amber-500/10 text-amber-700 dark:text-amber-400 border-amber-500/20',
    avatarClass: 'bg-amber-600 text-white shadow-amber-500/20',
    ringClass: 'ring-amber-500',
    bgLightClass: 'bg-amber-50 dark:bg-amber-950/30',
    borderClass: 'border-amber-500/30',
    hex: '#d97706',
  },
  slate: {
    name: 'Grafito Obsidiana',
    description: 'Monocromático arquitectónico, discreto y refinado.',
    badgeClass: 'bg-slate-500/10 text-slate-700 dark:text-slate-300 border-slate-500/20',
    avatarClass: 'bg-slate-900 text-white dark:bg-slate-100 dark:text-slate-900 shadow-slate-900/20',
    ringClass: 'ring-slate-500',
    bgLightClass: 'bg-slate-100 dark:bg-slate-800/40',
    borderClass: 'border-slate-500/30',
    hex: '#0f172a',
  },
}

/**
 * Obtiene las preferencias almacenadas en el cliente de manera segura
 */
export function getUserPreferences(): UserPreferences {
  if (typeof window === 'undefined') return DEFAULT_PREFERENCES
  try {
    const raw = localStorage.getItem(PREFERENCES_STORAGE_KEY)
    if (!raw) return DEFAULT_PREFERENCES
    const parsed = JSON.parse(raw)
    return { ...DEFAULT_PREFERENCES, ...parsed }
  } catch {
    return DEFAULT_PREFERENCES
  }
}

/**
 * Guarda las preferencias actualizadas y notifica a todos los componentes suscritos
 */
export function saveUserPreferences(partial: Partial<UserPreferences>): UserPreferences {
  if (typeof window === 'undefined') return DEFAULT_PREFERENCES
  try {
    const current = getUserPreferences()
    const updated: UserPreferences = { ...current, ...partial }
    localStorage.setItem(PREFERENCES_STORAGE_KEY, JSON.stringify(updated))

    if (partial.theme !== undefined) {
      applyTheme(updated.theme)
    }

    if (partial.tableDensity !== undefined) {
      applyTableDensity(updated.tableDensity)
    }

    // Notificar reactivamente en la ventana
    window.dispatchEvent(
      new CustomEvent(PREFERENCES_CHANGED_EVENT, {
        detail: updated,
      }),
    )

    return updated
  } catch {
    return DEFAULT_PREFERENCES
  }
}

/**
 * Aplica el tema visual al elemento raíz <html>
 */
export function applyTheme(theme: ThemeMode) {
  if (typeof document === 'undefined') return

  const isDark =
    theme === 'dark' ||
    (theme === 'system' && window.matchMedia('(prefers-color-scheme: dark)').matches)

  if (isDark) {
    document.documentElement.classList.add('dark')
  } else {
    document.documentElement.classList.remove('dark')
  }
}

/**
 * Aplica la clase de densidad visual a la página
 */
export function applyTableDensity(density: TableDensity) {
  if (typeof document === 'undefined') return
  if (density === 'compact') {
    document.documentElement.classList.add('compact-density')
  } else {
    document.documentElement.classList.remove('compact-density')
  }
}

/**
 * Reproduce un tono sintetizado y sutil de confirmación POS usando Web Audio API
 */
export function playPosBeepSound() {
  if (typeof window === 'undefined') return
  try {
    const AudioCtx =
      window.AudioContext ||
      (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext
    if (!AudioCtx) return
    const ctx = new AudioCtx()
    const osc = ctx.createOscillator()
    const gain = ctx.createGain()

    osc.type = 'sine'
    // Tono agradable de caja registradora moderna (880Hz a 1760Hz en crescendo suave)
    osc.frequency.setValueAtTime(880, ctx.currentTime)
    osc.frequency.exponentialRampToValueAtTime(1760, ctx.currentTime + 0.08)

    gain.gain.setValueAtTime(0.12, ctx.currentTime)
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.22)

    osc.connect(gain)
    gain.connect(ctx.destination)

    osc.start()
    osc.stop(ctx.currentTime + 0.23)
  } catch {
    // Ignorar si el navegador restringe audio sin gesto
  }
}
