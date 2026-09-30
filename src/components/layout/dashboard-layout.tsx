'use client'

import { useState, useEffect } from 'react'
import { Sidebar } from './sidebar'
import { Header } from './header'
import { useKeyboardShortcuts } from '@/lib/keyboard-shortcuts'
import { cn } from '@/lib/utils'
import { AiFloatingChat } from '@/components/assistant/ai-floating-chat'

interface DashboardLayoutProps {
  children: React.ReactNode
  user: {
    name: string
    email: string
  }
}

const SIDEBAR_COLLAPSED_STORAGE_KEY = 'cilmax_sidebar_collapsed'

export function DashboardLayout({ children, user }: DashboardLayoutProps) {
  useKeyboardShortcuts()
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [isMobile, setIsMobile] = useState(false)
  const [isCollapsed, setIsCollapsed] = useState(() => {
    if (typeof window === 'undefined') return false
    try {
      return localStorage.getItem(SIDEBAR_COLLAPSED_STORAGE_KEY) === 'true'
    } catch {
      return false
    }
  })

  // Detectar mobile para asegurar que en pantallas pequeñas el menú móvil no colapse a sólo iconos
  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth < 1024)
    checkMobile()
    window.addEventListener('resize', checkMobile)
    return () => window.removeEventListener('resize', checkMobile)
  }, [])

  const toggleCollapse = () => {
    setIsCollapsed((prev) => {
      const next = !prev
      try {
        localStorage.setItem(SIDEBAR_COLLAPSED_STORAGE_KEY, String(next))
      } catch {
        // Ignorar
      }
      return next
    })
  }

  return (
    <div className="flex h-dvh bg-muted/30 overflow-hidden">
      {/* Overlay para móviles */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/60 backdrop-blur-xs lg:hidden transition-opacity"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Contenedor del Sidebar con ancho dinámico */}
      <aside
        className={cn(
          'fixed inset-y-0 left-0 z-50 transform transition-all duration-300 ease-in-out lg:static lg:transform-none shrink-0 shadow-2xl lg:shadow-none',
          sidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0',
          !isMobile && isCollapsed ? 'lg:w-18' : 'lg:w-64',
          'w-64' // En móvil siempre ancho completo cuando está abierto
        )}
      >
        <Sidebar
          collapsed={!isMobile && isCollapsed}
          onToggleCollapse={toggleCollapse}
          onMobileClose={() => setSidebarOpen(false)}
        />
      </aside>

      {/* Área Principal de Contenido - Ocupa todo el espacio restante */}
      <div className="flex flex-1 flex-col overflow-hidden min-w-0">
        <Header user={user} onMenuClick={() => setSidebarOpen(true)} />
        <main className="flex-1 overflow-y-auto p-4 sm:p-6 lg:p-7">
          <div className="mx-auto max-w-[1600px] w-full">{children}</div>
        </main>
      </div>

      {/* Chat flotante de IA con reportes y control del sistema */}
      <AiFloatingChat />
    </div>
  )
}
