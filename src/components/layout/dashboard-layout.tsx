'use client'

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

export function DashboardLayout({ children, user }: DashboardLayoutProps) {
  useKeyboardShortcuts()
  const [sidebarOpen, setSidebarOpen] = useState(false)

  return (
    <div className="flex h-dvh bg-muted/30">
      {sidebarOpen && (
        <div className="fixed inset-0 z-40 bg-black/50 lg:hidden" onClick={() => setSidebarOpen(false)} />
      )}

      <div
        className={cn(
          'fixed inset-y-0 left-0 z-50 w-64 transform transition-transform duration-200 ease-out lg:static lg:transform-none',
          sidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0',
        )}
      >
        <div className="flex h-full flex-col">
          <div className="flex items-center justify-between px-4 py-3 lg:hidden border-b border-sidebar-border bg-sidebar">
            <div className="flex items-center gap-3">
              <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-sidebar-primary shrink-0">
                <svg
                  className="h-3.5 w-3.5 text-sidebar-primary-foreground"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeWidth={2}
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M13.5 21v-7.5a.75.75 0 01.75-.75h3a.75.75 0 01.75.75V21m-4.5 0H2.36m11.14 0H18m0 0h3.64m-1.39 0V9.349m-16.5 11.65V9.35m0 0a3.001 3.001 0 003.75-.615A2.993 2.993 0 009.75 9.75c.896 0 1.7-.393 2.25-1.016a2.993 2.993 0 002.25 1.016c.896 0 1.7-.393 2.25-1.016a3.001 3.001 0 003.75.614m-16.5 0a3.004 3.004 0 01-.621-4.72L4.318 3.44A1.5 1.5 0 015.378 3h13.243a1.5 1.5 0 011.06.44l1.19 1.189a3 3 0 01-.621 4.72m-13.5 8.65h3.75a.75.75 0 00.75-.75V13.5a.75.75 0 00-.75-.75H6.75a.75.75 0 00-.75.75v3.75c0 .414.336.75.75.75z"
                  />
                </svg>
              </div>
              <h1 className="text-base font-bold text-white">Cilmax</h1>
            </div>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setSidebarOpen(false)}
              className="text-white/70 hover:text-white hover:bg-sidebar-accent"
            >
              <X className="h-5 w-5" />
            </Button>
          </div>
          <Sidebar />
        </div>
      </div>

      <div className="flex flex-1 flex-col overflow-hidden">
        <Header user={user} onMenuClick={() => setSidebarOpen(true)} />
        <main className="flex-1 overflow-y-auto p-5 lg:p-8">
          <div className="mx-auto max-w-7xl">{children}</div>
        </main>
      </div>

      {/* Chat flotante de IA — disponible en todas las páginas */}
      <AiFloatingChat />
    </div>
  )
}
