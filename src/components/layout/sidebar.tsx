'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { cn } from '@/lib/utils'
import {
  LayoutDashboard,
  Store,
  ShoppingBag,
  FileText,
  Settings,
  Keyboard,
  Users,
  Package,
  DollarSign,
  ShoppingCart,
  HandCoins,
  Bot,
} from 'lucide-react'

const navigation = [
  { name: 'Dashboard', href: '/dashboard', icon: LayoutDashboard },
  { name: 'Ventas', href: '/sales', icon: ShoppingCart },
  { name: 'Tienda online', href: '/web', icon: ShoppingBag },
  { name: 'Créditos', href: '/credits', icon: HandCoins },
  { name: 'Inventario', href: '/inventory', icon: Package },
  { name: 'Clientes', href: '/clients', icon: Users },
  { name: 'Finanzas', href: '/finances', icon: DollarSign },
  { name: 'Reportes', href: '/reports', icon: FileText },
  { name: 'Asistente IA', href: '/assistant', icon: Bot },
]

export function Sidebar() {
  const pathname = usePathname()

  function isActive(href: string) {
    return pathname === href || pathname.startsWith(href + '/')
  }

  return (
    <div className="flex h-full w-64 flex-col bg-sidebar text-sidebar-foreground">
      <div className="flex h-16 items-center gap-3 px-6 border-b border-sidebar-border">
        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-sidebar-primary shrink-0 shadow-sm shadow-sidebar-primary/30">
          <Store className="h-4 w-4 text-sidebar-primary-foreground" />
        </div>
        <div>
          <p className="text-xs font-semibold tracking-tight leading-tight">
            Cil<span className="font-light text-sidebar-foreground/60">max</span>
          </p>
          <p className="text-[10px] text-sidebar-foreground/35 tracking-wider uppercase">Sistema de Tienda</p>
        </div>
      </div>

      <nav className="flex-1 space-y-0.5 px-3 py-4 overflow-y-auto">
        {navigation.map((item) => {
          const active = isActive(item.href)
          return (
            <Link
              key={item.name}
              href={item.href}
              className={cn(
                'group relative flex items-center rounded-lg px-3 py-2.5 text-sm font-medium transition-all duration-200',
                active
                  ? 'bg-sidebar-primary/15 text-sidebar-primary-foreground shadow-sm shadow-sidebar-primary/10'
                  : 'text-sidebar-foreground/60 hover:bg-sidebar-accent/80 hover:text-sidebar-foreground/90',
              )}
            >
              {active && (
                <span className="absolute left-0 top-1/2 -translate-y-1/2 h-5 w-[3px] rounded-r-full bg-sidebar-primary" />
              )}
              <item.icon
                className={cn(
                  'mr-3 h-4 w-4 shrink-0 transition-all duration-200',
                  active ? 'text-sidebar-primary opacity-100' : 'opacity-70 group-hover:opacity-100',
                )}
              />
              <span className="flex-1">{item.name}</span>
              {active && <span className="h-1.5 w-1.5 rounded-full bg-sidebar-primary animate-pulse" />}
            </Link>
          )
        })}

        <div className="pt-4 mt-4 border-t border-sidebar-border space-y-0.5">
          <Link
            href="/admin"
            className={cn(
              'group relative flex items-center rounded-lg px-3 py-2.5 text-sm font-medium transition-all duration-200',
              pathname === '/admin'
                ? 'bg-sidebar-primary/15 text-sidebar-primary-foreground shadow-sm shadow-sidebar-primary/10'
                : 'text-sidebar-foreground/60 hover:bg-sidebar-accent/80 hover:text-sidebar-foreground/90',
            )}
          >
            {pathname === '/admin' && (
              <span className="absolute left-0 top-1/2 -translate-y-1/2 h-5 w-[3px] rounded-r-full bg-sidebar-primary" />
            )}
            <Settings
              className={cn(
                'mr-3 h-4 w-4 shrink-0 transition-all duration-200',
                pathname === '/admin' ? 'text-sidebar-primary opacity-100' : 'opacity-70 group-hover:opacity-100',
              )}
            />
            <span className="flex-1">Administración</span>
            {pathname === '/admin' && <span className="h-1.5 w-1.5 rounded-full bg-sidebar-primary animate-pulse" />}
          </Link>
        </div>
      </nav>

      <div className="border-t border-sidebar-border px-4 py-3">
        <div className="flex items-center gap-2 text-[11px] text-sidebar-foreground/30">
          <Keyboard className="h-3 w-3 shrink-0" />
          <span>Alt+Q buscar &middot; Alt+D dashboard</span>
        </div>
      </div>
    </div>
  )
}
