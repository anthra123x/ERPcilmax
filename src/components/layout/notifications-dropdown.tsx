'use client'

import { useEffect, useState, useCallback } from 'react'
import { Bell, CheckCheck, Loader2, Info, Package } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { getNotificationData, markAsRead, markAllAsRead } from '@/modules/notifications/notifications.actions'
import { cn } from '@/lib/utils'
import { useRouter } from 'next/navigation'
import type { NotificationType } from '@prisma/client'

type Notification = {
  id: string
  userId: string | null
  type: NotificationType
  title: string
  message: string | null
  entityType: string | null
  entityId: string | null
  read: boolean
  createdAt: Date
}

const typeConfig: Record<NotificationType, { icon: typeof Bell; color: string }> = {
  SYSTEM: { icon: Info, color: 'bg-gray-100 text-gray-600' },
  LOW_STOCK: { icon: Package, color: 'bg-orange-100 text-orange-600' },
}

function timeAgo(date: Date) {
  const seconds = Math.floor((Date.now() - new Date(date).getTime()) / 1000)
  if (seconds < 60) return 'ahora'
  const minutes = Math.floor(seconds / 60)
  if (minutes < 60) return `${minutes}m`
  const hours = Math.floor(minutes / 60)
  if (hours < 24) return `${hours}h`
  const days = Math.floor(hours / 24)
  if (days < 7) return `${days}d`
  return new Date(date).toLocaleDateString('es-CO', { day: 'numeric', month: 'short' })
}

function getEntityRoute(entityType: string | null, entityId: string | null): string | null {
  if (!entityType || !entityId) return null
  switch (entityType) {
    case 'budget_period':
    case 'saving_goal':
      return '/assistant'
    default:
      return null
  }
}

export function NotificationsDropdown() {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [notifications, setNotifications] = useState<Notification[]>([])
  const [unreadCount, setUnreadCount] = useState(0)
  const [loading, setLoading] = useState(false)

  const load = useCallback(async (showLoader?: boolean) => {
    if (showLoader) setLoading(true)
    const data = await getNotificationData(1, 10)
    setNotifications(data.notifications as Notification[])
    setUnreadCount(data.unreadCount)
    if (showLoader) setLoading(false)
  }, [])

  useEffect(() => {
    let mounted = true
    async function fetchData() {
      const data = await getNotificationData(1, 10)
      if (!mounted) return
      setNotifications(data.notifications as Notification[])
      setUnreadCount(data.unreadCount)
    }
    void fetchData()
    const interval = setInterval(() => void fetchData(), 30000)
    return () => {
      mounted = false
      clearInterval(interval)
    }
  }, [])

  async function handleOpenChange(open: boolean) {
    setOpen(open)
    if (open) load(true)
  }

  async function handleClick(notif: Notification) {
    if (!notif.read) {
      await markAsRead(notif.id)
      setNotifications((prev) => prev.map((n) => (n.id === notif.id ? { ...n, read: true } : n)))
      setUnreadCount((prev) => Math.max(0, prev - 1))
    }
    const route = getEntityRoute(notif.entityType, notif.entityId)
    if (route) router.push(route)
  }

  async function handleMarkAllAsRead() {
    await markAllAsRead()
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })))
    setUnreadCount(0)
  }

  return (
    <DropdownMenu open={open} onOpenChange={handleOpenChange}>
      <DropdownMenuTrigger
        render={
          <Button variant="ghost" size="icon" className="relative">
            <Bell className="h-5 w-5" />
            {unreadCount > 0 && (
              <span className="absolute -top-1 -right-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-destructive px-1 text-[10px] font-medium text-destructive-foreground">
                {unreadCount > 99 ? '99+' : unreadCount}
              </span>
            )}
          </Button>
        }
      />
      <DropdownMenuContent align="end" className="w-80">
        <DropdownMenuGroup>
          <DropdownMenuLabel className="flex items-center justify-between">
            <span>Notificaciones</span>
            {unreadCount > 0 && (
              <button
                onClick={handleMarkAllAsRead}
                className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors"
              >
                <CheckCheck className="h-3 w-3" />
                Marcar todo leído
              </button>
            )}
          </DropdownMenuLabel>
          <DropdownMenuSeparator />
        </DropdownMenuGroup>
        <div className="max-h-80 overflow-y-auto">
          {loading && notifications.length === 0 ? (
            <div className="flex justify-center py-8">
              <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
            </div>
          ) : notifications.length === 0 ? (
            <div className="py-8 text-center text-sm text-muted-foreground">No hay notificaciones</div>
          ) : (
            <DropdownMenuGroup>
              {notifications.map((notif) => {
                const { icon: Icon, color } = typeConfig[notif.type]
                return (
                  <DropdownMenuItem
                    key={notif.id}
                    className={cn('flex items-start gap-3 px-3 py-2.5 cursor-pointer', !notif.read && 'bg-muted/50')}
                    onClick={() => handleClick(notif)}
                  >
                    <div
                      className={cn(
                        'mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full',
                        !notif.read ? color : 'bg-muted text-muted-foreground',
                      )}
                    >
                      <Icon className="h-3.5 w-3.5" />
                    </div>
                    <div className="flex-1 space-y-0.5 min-w-0">
                      <p className={cn('text-sm leading-tight truncate', !notif.read && 'font-medium')}>
                        {notif.title}
                      </p>
                      {notif.message && <p className="text-xs text-muted-foreground line-clamp-2">{notif.message}</p>}
                      <p className="text-[10px] text-muted-foreground">{timeAgo(notif.createdAt)}</p>
                    </div>
                    {!notif.read && <span className="mt-2 h-2 w-2 shrink-0 rounded-full bg-primary" />}
                  </DropdownMenuItem>
                )
              })}
            </DropdownMenuGroup>
          )}
        </div>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
