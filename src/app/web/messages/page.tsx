import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { PageHeader } from '@/components/ui/page-header'
import { EmptyState } from '@/components/ui/empty-state'
import { getAdminWebMessages } from '@/modules/web/web.actions'
import { WebMessageActions } from '@/components/web/web-message-actions'

export const dynamic = 'force-dynamic'

function fmtDate(d: Date) {
  return new Date(d).toLocaleDateString('es-CO', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

export default async function WebMessagesPage() {
  const messages = await getAdminWebMessages()
  const unread = messages.filter((m) => !m.read).length

  return (
    <div className="page-container py-6 space-y-6">
      <PageHeader
        title="Mensajes de contacto"
        description={unread > 0 ? `${unread} sin leer` : 'Todos los mensajes están leídos'}
      />

      <Card>
        <CardContent className="p-4 space-y-2">
          {messages.length === 0 ? (
            <EmptyState title="Sin mensajes" description="Los mensajes del formulario de contacto aparecerán aquí." />
          ) : (
            <ul className="divide-y divide-border">
              {messages.map((m) => (
                <li key={m.id} className="flex items-start justify-between gap-4 py-3">
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="text-sm font-medium">{m.name}</p>
                      {!m.read && <Badge variant="default">Nuevo</Badge>}
                      <span className="text-xs text-muted-foreground">{fmtDate(m.createdAt)}</span>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      {m.phone && <span>{m.phone} · </span>}
                      {m.email && <span>{m.email}</span>}
                    </p>
                    <p className="mt-1 whitespace-pre-wrap text-sm text-muted-foreground">{m.message}</p>
                  </div>
                  <WebMessageActions id={m.id} read={m.read} />
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
