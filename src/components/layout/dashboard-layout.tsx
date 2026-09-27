'use client'

import Image from 'next/image'
import { useState } from 'react'
import { Sidebar } from './sidebar'
import { Header } from './header'
import { useKeyboardShortcuts } from '@/lib/keyboard-shortcuts'
import { cn } from '@/lib/utils'
import { X } from 'lucide-react'
import { Button } from '@/components/ui/button'
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
  const [isCollapsed, setIsCollapsed] = useState(() => {
    if (typeof window === 'undefined') return false
    try {
      return localStorage.getItem(SIDEBAR_COLLAPSED_STORAGE_KEY) === 'true'
    } catch {
      return false
    }
  })

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
          className="fixed inset-0 z-40 bg-black/50 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Contenedor del Sidebar con ancho dinámico */}
      <aside
        className={cn(
          'fixed inset-y-0 left-0 z-50 transform transition-all duration-300 ease-in-out lg:static lg:transform-none shrink-0',
          sidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0',
          isCollapsed ? 'lg:w-18' : 'lg:w-64',
          'w-64' // En móvil siempre ancho completo cuando está abierto
        )}
      >
        <div className="flex h-full flex-col bg-sidebar shadow-md">
          {/* Header móvil con logo oficial */}
          <div className="flex items-center justify-between px-4 py-3 lg:hidden border-b border-sidebar-border/80 bg-sidebar">
            <div className="flex items-center gap-2">
              <Image
                src="/logo cilmax.png"
                alt="Cilmax ERP"
                width={130}
                height={32}
                priority
                className="h-7.5 w-auto object-contain"
              />
            </div>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setSidebarOpen(false)}
              className="text-white/70 hover:text-white hover:bg-sidebar-accent rounded-lg"
            >
              <X className="h-5 w-5" />
            </Button>
          </div>

          <Sidebar
            collapsed={isCollapsed}
            onToggleCollapse={toggleCollapse}
          />
        </div>
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
