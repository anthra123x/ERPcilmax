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
  PanelLeftClose,
  PanelLeftOpen,
  ChevronDown,
  X,
  Keyboard,
  LogOut,
  User as UserIcon,
  Bot,
} from 'lucide-react'
import { NovaLogo } from '@/components/ui/nova-logo'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { useRouter } from 'next/navigation'

interface SidebarProps {
  user?: {
    name: string
    email: string
  }
  collapsed?: boolean
  onToggleCollapse?: () => void
  onMobileClose?: () => void
}

interface NavItem {
  name: string
  href: string
  icon: React.ElementType
}

interface NavSection {
  title: string
  items: NavItem[]
}

const navSections: NavSection[] = [
  {
    title: 'Operación',
    items: [
      { name: 'Dashboard', href: '/dashboard', icon: LayoutDashboard },
      { name: 'Ventas (POS)', href: '/sales', icon: ShoppingCart },
      { name: 'Tienda Online', href: '/web', icon: ShoppingBag },
      { name: 'Inventario', href: '/inventory', icon: Package },
    ],
  },
  {
    title: 'Clientes & Cartera',
    items: [
      { name: 'Clientes', href: '/clients', icon: Users },
      { name: 'Créditos', href: '/credits', icon: HandCoins },
    ],
  },
  {
    title: 'Sistema',
    items: [{ name: 'Administración', href: '/admin', icon: Settings }],
  },
]

export function Sidebar({ user, collapsed = false, onToggleCollapse, onMobileClose }: SidebarProps) {
  const pathname = usePathname()
  const router = useRouter()

  function isActive(href: string) {
    if (href === '/dashboard') return pathname === '/dashboard'
    return pathname === href || pathname.startsWith(href + '/')
  }

  function handleLinkClick() {
    if (onMobileClose) {
      onMobileClose()
    }
  }

  const userInitials = user?.name
    ? user.name
        .split(' ')
        .map((n) => n[0])
        .slice(0, 2)
        .join('')
        .toUpperCase()
    : 'AD'

  return (
    <div className="flex h-full w-full flex-col bg-sidebar text-sidebar-foreground select-none border-r border-sidebar-border/70 transition-all duration-200">
      {/* Workspace Header */}
      <div className="p-3 border-b border-sidebar-border/60 shrink-0">
        {!collapsed ? (
          <div className="flex items-center justify-between gap-2 p-1.5 rounded-xl border border-sidebar-border/70 bg-card shadow-2xs">
            <div className="flex items-center gap-2.5 min-w-0">
              <NovaLogo size="sm" showWordmark={false} />
              <div className="flex flex-col min-w-0 text-left">
                <span className="truncate text-xs font-bold text-foreground tracking-tight leading-tight">
                  Nova ERP
                </span>
                <span className="truncate text-[10px] text-muted-foreground font-medium">Workspace Principal</span>
              </div>
            </div>

            <div className="flex items-center gap-0.5 shrink-0">
              {onToggleCollapse && (
                <button
                  type="button"
                  onClick={onToggleCollapse}
                  title="Contraer menú"
                  aria-label="Contraer menú"
                  className="hidden lg:flex items-center justify-center h-6 w-6 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted/60 transition-colors cursor-pointer"
                >
                  <PanelLeftClose className="h-3.5 w-3.5" />
                </button>
              )}

              {onMobileClose && (
                <button
                  type="button"
                  onClick={onMobileClose}
                  title="Cerrar menú"
                  aria-label="Cerrar menú"
                  className="lg:hidden flex items-center justify-center h-7 w-7 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted/60 transition-colors cursor-pointer"
                >
                  <X className="h-4 w-4" />
                </button>
              )}
            </div>
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center gap-2">
            <NovaLogo size="sm" showWordmark={false} />
            {onToggleCollapse && (
              <button
                type="button"
                onClick={onToggleCollapse}
                title="Expandir menú"
                aria-label="Expandir menú"
                className="hidden lg:flex items-center justify-center h-7 w-7 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted/60 transition-colors cursor-pointer"
              >
                <PanelLeftOpen className="h-3.5 w-3.5" />
              </button>
            )}
          </div>
        )}
      </div>

      {/* Navegación limpia y enfocada */}
      <nav
        className={cn(
          'flex-1 overflow-y-auto overflow-x-hidden py-3 space-y-5',
          collapsed ? 'px-2 flex flex-col items-center' : 'px-3',
        )}
      >
        {navSections.map((section) => (
          <div key={section.title} className="w-full">
            {!collapsed && (
              <div className="px-2.5 mb-1.5 text-[10px] font-bold uppercase tracking-wider text-muted-foreground/70">
                {section.title}
              </div>
            )}

            <div className={cn('space-y-1', collapsed && 'space-y-2')}>
              {section.items.map((item) => {
                const active = isActive(item.href)

                if (collapsed) {
                  return (
                    <div key={item.name} className="relative group flex justify-center w-full">
                      <Link
                        href={item.href}
                        onClick={handleLinkClick}
                        aria-label={item.name}
                        className={cn(
                          'flex h-10 w-10 items-center justify-center rounded-xl transition-all duration-150 cursor-pointer',
                          active
                            ? 'bg-card text-foreground font-bold shadow-xs border border-sidebar-border ring-1 ring-border/50'
                            : 'text-muted-foreground hover:bg-muted/50 hover:text-foreground',
                        )}
                      >
                        <item.icon className="h-4.5 w-4.5 shrink-0" />
                      </Link>

                      <div className="absolute left-full ml-3 top-1/2 -translate-y-1/2 px-2.5 py-1 rounded-md bg-gray-950 text-white text-xs font-medium whitespace-nowrap shadow-xl border border-white/10 z-50 pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity duration-150">
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
                      'group relative flex items-center justify-between gap-3 px-3 py-2 rounded-xl text-xs transition-all duration-150',
                      active
                        ? 'bg-card text-foreground font-semibold shadow-xs border border-sidebar-border/80'
                        : 'text-muted-foreground hover:bg-muted/50 hover:text-foreground font-medium',
                    )}
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <item.icon
                        className={cn(
                          'h-4 w-4 shrink-0 transition-colors',
                          active ? 'text-foreground' : 'text-muted-foreground group-hover:text-foreground',
                        )}
                      />
                      <span className="truncate">{item.name}</span>
                    </div>
                  </Link>
                )
              })}
            </div>
          </div>
        ))}
      </nav>

      {/* Tarjeta de perfil de usuario */}
      <div className="p-3 border-t border-sidebar-border/60 shrink-0">
        {!collapsed ? (
          <DropdownMenu>
            <DropdownMenuTrigger className="w-full flex items-center justify-between gap-2.5 p-2 rounded-2xl bg-card border border-sidebar-border/80 shadow-2xs hover:bg-muted/40 transition-colors cursor-pointer outline-none">
              <div className="flex items-center gap-2.5 min-w-0">
                <div className="h-8 w-8 rounded-full bg-gray-900 text-white flex items-center justify-center shrink-0 font-bold text-xs ring-2 ring-gray-900/10 dark:ring-white/10">
                  {userInitials}
                </div>
                <div className="flex flex-col min-w-0 text-left">
                  <span className="truncate text-xs font-semibold text-foreground leading-tight">
                    {user?.name || 'Administrador'}
                  </span>
                  <span className="truncate text-[10px] text-muted-foreground">
                    {user?.email || 'admin@empresa.com'}
                  </span>
                </div>
              </div>
              <ChevronDown className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56 mb-2 rounded-2xl border-border shadow-xl p-1.5">
              <DropdownMenuLabel className="font-normal px-2.5 py-2">
                <div className="flex flex-col gap-0.5">
                  <span className="font-semibold text-xs text-foreground">{user?.name || 'Administrador'}</span>
                  <span className="text-[11px] text-muted-foreground truncate">
                    {user?.email || 'admin@empresa.com'}
                  </span>
                </div>
              </DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                onClick={() => router.push('/profile')}
                className="cursor-pointer rounded-xl text-xs py-2"
              >
                <UserIcon className="mr-2 h-4 w-4" />
                <span>Mi Perfil</span>
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={() => router.push('/assistant')}
                className="cursor-pointer rounded-xl text-xs py-2"
              >
                <Bot className="mr-2 h-4 w-4 text-emerald-500" />
                <span>Asistente IA</span>
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={() => router.push('/admin')}
                className="cursor-pointer rounded-xl text-xs py-2"
              >
                <Settings className="mr-2 h-4 w-4" />
                <span>Configuración</span>
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                onClick={() => router.push('/auth/logout')}
                className="text-destructive focus:text-destructive cursor-pointer rounded-xl text-xs py-2"
              >
                <LogOut className="mr-2 h-4 w-4" />
                <span>Cerrar Sesión</span>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        ) : (
          <div className="flex justify-center w-full">
            <button
              type="button"
              onClick={() => router.push('/profile')}
              title={user?.name || 'Perfil'}
              className="h-9 w-9 rounded-full bg-gray-900 text-white flex items-center justify-center font-bold text-xs ring-2 ring-gray-900/10 cursor-pointer"
            >
              {userInitials}
            </button>
          </div>
        )}

        {/* Atajos de teclado */}
        {!collapsed && (
          <div className="mt-2 px-1 text-[10px] text-muted-foreground/60 flex items-center gap-1 font-mono justify-center">
            <Keyboard className="h-3 w-3" />
            <span>Alt+Q buscar &bull; Alt+V ventas</span>
          </div>
        )}
      </div>
    </div>
  )
}
