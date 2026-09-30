'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { cn } from '@/lib/utils'
import {
  LayoutDashboard,
  ShoppingCart,
  ShoppingBag,
  HandCoins,
  Package,
  Users,
  Settings,
  Keyboard,
  PanelLeftClose,
  PanelLeftOpen,
  Boxes,
  X,
} from 'lucide-react'

// Módulos principales de navegación
const navigation = [
  { name: 'Dashboard', href: '/dashboard', icon: LayoutDashboard },
  { name: 'Ventas', href: '/sales', icon: ShoppingCart },
  { name: 'Tienda online', href: '/web', icon: ShoppingBag },
  { name: 'Créditos', href: '/credits', icon: HandCoins },
  { name: 'Inventario', href: '/inventory', icon: Package },
  { name: 'Clientes', href: '/clients', icon: Users },
]

interface SidebarProps {
  collapsed?: boolean
  onToggleCollapse?: () => void
  onMobileClose?: () => void
}

export function Sidebar({ collapsed = false, onToggleCollapse, onMobileClose }: SidebarProps) {
  const pathname = usePathname()

  function isActive(href: string) {
    return pathname === href || pathname.startsWith(href + '/')
  }

  function handleLinkClick() {
    if (onMobileClose) {
      onMobileClose()
    }
  }

  return (
    <div className="flex h-full w-full flex-col bg-sidebar text-sidebar-foreground select-none border-r border-sidebar-border/60">
      {/* Header superior: h-16 alineado exactamente con el Header principal de la página */}
      <div
        className={cn(
          'flex h-16 items-center border-b border-sidebar-border/40 shrink-0 transition-all duration-200',
          collapsed ? 'justify-center px-2' : 'justify-between px-3.5'
        )}
      >
        {!collapsed && (
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-400">
              <Boxes className="h-4 w-4" />
            </div>
            <div className="flex flex-col min-w-0">
              <span className="truncate text-xs font-semibold text-white tracking-tight uppercase">
                Nova ERP
              </span>
              <span className="truncate text-[10px] font-medium text-emerald-400/90 flex items-center gap-1.5">
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" />
                Sistema Activo
              </span>
            </div>
          </div>
        )}

        <div className="flex items-center gap-1">
          {/* Botón de cerrar en móvil */}
          {onMobileClose && (
            <button
              type="button"
              onClick={onMobileClose}
              title="Cerrar menú"
              aria-label="Cerrar menú"
              className="lg:hidden flex items-center justify-center h-8 w-8 rounded-lg text-sidebar-foreground/60 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
            >
              <X className="h-4 w-4" />
            </button>
          )}

          {/* Botón de contraer / expandir en escritorio */}
          {onToggleCollapse && (
            <div className={cn('relative group', collapsed && 'flex justify-center w-full')}>
              <button
                type="button"
                onClick={onToggleCollapse}
                title={collapsed ? 'Expandir barra lateral' : 'Contraer barra lateral'}
                aria-label="Alternar barra lateral"
                className={cn(
                  'hidden lg:flex items-center justify-center rounded-lg text-sidebar-foreground/60 hover:text-white hover:bg-white/10 transition-all cursor-pointer',
                  collapsed ? 'h-9 w-9' : 'h-7 w-7'
                )}
              >
                {collapsed ? <PanelLeftOpen className="h-4 w-4" /> : <PanelLeftClose className="h-4 w-4" />}
              </button>
              {collapsed && (
                <div className="absolute left-full ml-3 top-1/2 -translate-y-1/2 px-2.5 py-1 rounded-md bg-slate-900 text-white text-xs font-medium whitespace-nowrap shadow-xl border border-white/10 z-50 pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity duration-150">
                  Expandir menú
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Navegación de módulos */}
      <nav
        className={cn(
          'flex-1 overflow-y-auto overflow-x-hidden py-3',
          collapsed ? 'px-2 space-y-2 flex flex-col items-center' : 'px-3 space-y-1'
        )}
      >
        {navigation.map((item) => {
          const active = isActive(item.href)

          if (collapsed) {
            return (
              <div key={item.name} className="relative group flex justify-center w-full">
                <Link
                  href={item.href}
                  onClick={handleLinkClick}
                  aria-label={item.name}
                  className={cn(
                    'flex h-10 w-10 items-center justify-center rounded-xl transition-all duration-150 cursor-pointer relative',
                    active
                      ? 'bg-white/10 text-emerald-400 font-semibold shadow-xs ring-1 ring-white/15 before:absolute before:left-0 before:top-2 before:bottom-2 before:w-1 before:rounded-r-full before:bg-emerald-400'
                      : 'text-sidebar-foreground/65 hover:bg-white/[0.06] hover:text-white'
                  )}
                >
                  <item.icon className="h-4.5 w-4.5 shrink-0" />
                </Link>

                <div className="absolute left-full ml-3 top-1/2 -translate-y-1/2 px-2.5 py-1 rounded-md bg-slate-900 text-white text-xs font-medium whitespace-nowrap shadow-xl border border-white/10 z-50 pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity duration-150">
                  {item.name}
                </div>
              </div>
            )
          }

          return (
            <Link
              key={item.name}
              href={item.href}
              onClick={handleLinkClick}
              className={cn(
                'group relative flex items-center gap-3 px-3 py-2 rounded-xl text-sm font-medium transition-all duration-150',
                active
                  ? 'bg-white/[0.08] text-white font-medium border border-white/10 shadow-xs before:absolute before:left-0 before:top-2 before:bottom-2 before:w-1 before:rounded-r-full before:bg-emerald-400'
                  : 'text-sidebar-foreground/70 hover:bg-white/[0.04] hover:text-white'
              )}
            >
              <item.icon
                className={cn(
                  'h-4.5 w-4.5 shrink-0 transition-colors duration-150',
                  active ? 'text-emerald-400' : 'text-sidebar-foreground/60 group-hover:text-white'
                )}
              />
              <span className="flex-1 truncate tracking-tight">{item.name}</span>
            </Link>
          )
        })}

        {/* Separador y enlace de Administración */}
        <div
          className={cn(
            'border-t border-sidebar-border/40 pt-2.5 mt-2.5 w-full',
            collapsed && 'flex justify-center'
          )}
        >
          {collapsed ? (
            <div className="relative group flex justify-center w-full">
              <Link
                href="/admin"
                onClick={handleLinkClick}
                aria-label="Administración"
                className={cn(
                  'flex h-10 w-10 items-center justify-center rounded-xl transition-all duration-150 cursor-pointer relative',
                  pathname === '/admin'
                    ? 'bg-white/10 text-emerald-400 font-semibold shadow-xs ring-1 ring-white/15 before:absolute before:left-0 before:top-2 before:bottom-2 before:w-1 before:rounded-r-full before:bg-emerald-400'
                    : 'text-sidebar-foreground/65 hover:bg-white/[0.06] hover:text-white'
                )}
              >
                <Settings className="h-4.5 w-4.5 shrink-0" />
              </Link>
              <div className="absolute left-full ml-3 top-1/2 -translate-y-1/2 px-2.5 py-1 rounded-md bg-slate-900 text-white text-xs font-medium whitespace-nowrap shadow-xl border border-white/10 z-50 pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity duration-150">
                Administración
              </div>
            </div>
          ) : (
            <Link
              href="/admin"
              onClick={handleLinkClick}
              className={cn(
                'group relative flex items-center gap-3 px-3 py-2 rounded-xl text-sm font-medium transition-all duration-150',
                pathname === '/admin'
                  ? 'bg-white/[0.08] text-white font-medium border border-white/10 shadow-xs before:absolute before:left-0 before:top-2 before:bottom-2 before:w-1 before:rounded-r-full before:bg-emerald-400'
                  : 'text-sidebar-foreground/70 hover:bg-white/[0.04] hover:text-white'
              )}
            >
              <Settings
                className={cn(
                  'h-4.5 w-4.5 shrink-0 transition-colors duration-150',
                  pathname === '/admin' ? 'text-emerald-400' : 'text-sidebar-foreground/60 group-hover:text-white'
                )}
              />
              <span className="flex-1 truncate tracking-tight">Administración</span>
            </Link>
          )}
        </div>
      </nav>

      {/* Pie de la barra lateral: atajos de teclado */}
      <div className="border-t border-sidebar-border/40 p-2.5 shrink-0">
        {collapsed ? (
          <div className="relative group flex justify-center w-full">
            <button
              type="button"
              onClick={onToggleCollapse}
              title="Expandir barra lateral"
              className="flex h-8 w-8 items-center justify-center rounded-lg text-sidebar-foreground/40 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
            >
              <Keyboard className="h-4 w-4" />
            </button>
            <div className="absolute left-full ml-3 top-1/2 -translate-y-1/2 px-2.5 py-1 rounded-md bg-slate-900 text-white text-[11px] font-mono whitespace-nowrap shadow-xl border border-white/10 z-50 pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity duration-150">
              Alt+Q: Buscar · Alt+V: Ventas
            </div>
          </div>
        ) : (
          <div className="px-2 py-1 text-[10.5px] text-sidebar-foreground/45 flex items-center justify-between font-mono">
            <div className="flex items-center gap-1.5">
              <Keyboard className="h-3.5 w-3.5 shrink-0 text-sidebar-foreground/35" />
              <span>Alt+Q buscar &bull; Alt+V ventas</span>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}