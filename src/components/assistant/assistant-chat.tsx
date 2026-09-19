'use client'

import { useEffect, useRef, useState } from 'react'
import { Bot, Loader2, Send, Sparkles } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader } from '@/components/ui/card'
import { Textarea } from '@/components/ui/textarea'
import { chatWithAssistant, getAssistantStatus } from '@/modules/ai/ai.actions'
import type { AssistantStatus, AssistantToolName } from '@/modules/ai/ai.types'
import { cn } from '@/lib/utils'

interface ChatMessage {
  role: 'user' | 'assistant'
  content: string
  meta?: {
    mode?: 'ai' | 'mock'
    agentModel?: string
    toolsUsed?: AssistantToolName[]
  }
}

const SUGGESTED_QUESTIONS = [
  '¿Cómo van las ventas de hoy?',
  '¿Qué productos tienen stock bajo?',
  '¿Hay pedidos pendientes en la tienda online?',
  '¿Cuánto dinero me deben a crédito?',
  'Resumen general del negocio',
]

const TOOL_LABELS: Record<AssistantToolName, string> = {
  get_business_snapshot: 'Vista general',
  get_sales_summary: 'Ventas',
  get_inventory_status: 'Inventario',
  get_web_orders_status: 'Pedidos web',
  get_recent_sales: 'Últimas ventas',
  get_client_summary: 'Clientes',
  get_pending_credit: 'Créditos',
  get_contact_messages: 'Mensajes',
  get_finance_summary: 'Finanzas',
}

export function AssistantChat() {
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [status, setStatus] = useState<AssistantStatus | null>(null)
  const scrollRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    getAssistantStatus().then(setStatus).catch(() => setStatus(null))
  }, [])

  useEffect(() => {
    const el = scrollRef.current
    if (el) el.scrollTop = el.scrollHeight
  }, [messages, loading])

  async function send(text: string) {
    const trimmed = text.trim()
    if (!trimmed || loading) return
    setInput('')
    setMessages((prev) => [...prev, { role: 'user', content: trimmed }])
    setLoading(true)

    const history = messages.map((m) => ({ role: m.role, content: m.content }))

    try {
      const result = await chatWithAssistant({ message: trimmed, history })
      setMessages((prev) => [
        ...prev,
        {
          role: 'assistant',
          content: result.reply,
          meta: {
            mode: result.mode,
            agentModel: result.agent?.model,
            toolsUsed: result.toolsUsed,
          },
        },
      ])
    } catch {
      setMessages((prev) => [
        ...prev,
        {
          role: 'assistant',
          content: 'Ocurrió un error al consultar al asistente. Por favor inténtalo de nuevo.',
          meta: { mode: 'mock' },
        },
      ])
    } finally {
      setLoading(false)
    }
  }

  return (
    <Card className="card-shadow overflow-hidden">
      <CardHeader className="border-b border-border/60 bg-muted/30 py-3.5">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="rounded-xl bg-primary/10 p-2 shadow-sm shadow-primary/10">
              <Bot className="h-4 w-4 text-primary" />
            </div>
            <div>
              <p className="text-sm font-semibold leading-tight">Asistente IA</p>
              <p className="text-xs text-muted-foreground capitalize">
                {status?.enabled
                  ? `IA activa · ${status.agents.length} ${status.agents.length === 1 ? 'agente' : 'agentes'} configurado${status.agents.length === 1 ? '' : 's'}`
                  : 'Modo simulación (sin API keys)'}
              </p>
            </div>
          </div>
          <Badge variant="outline" className="gap-1 text-muted-foreground">
            <Sparkles className="h-3 w-3" />
            Contexto del negocio
          </Badge>
        </div>
      </CardHeader>

      <CardContent className="p-0">
        <div ref={scrollRef} className="h-[460px] overflow-y-auto space-y-4 p-4">
          {messages.length === 0 && (
            <div className="h-full flex flex-col items-center justify-center text-center gap-5 px-6">
              <div className="rounded-2xl bg-primary/10 p-3 shadow-sm shadow-primary/10">
                <Bot className="h-8 w-8 text-primary" />
              </div>
              <div className="space-y-1">
                <p className="text-sm font-semibold">Pregúntale a tu negocio</p>
                <p className="text-xs text-muted-foreground max-w-md text-pretty">
                  Consulta ventas, inventario, pedidos de la tienda online, créditos y más con datos en tiempo real.
                </p>
              </div>
              <div className="flex flex-wrap justify-center gap-2 max-w-md">
                {SUGGESTED_QUESTIONS.map((q) => (
                  <Button
                    key={q}
                    variant="outline"
                    size="sm"
                    className="rounded-full text-muted-foreground hover:text-foreground"
                    onClick={() => send(q)}
                    disabled={loading}
                  >
                    {q}
                  </Button>
                ))}
              </div>
            </div>
          )}

          {messages.map((msg, index) => (
            <MessageBubble key={index} message={msg} />
          ))}

          {loading && (
            <div className="flex items-start gap-2.5">
              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-primary/10 shadow-sm shadow-primary/10">
                <Bot className="h-4 w-4 text-primary" />
              </div>
              <div className="flex h-8 items-center gap-1.5 rounded-2xl rounded-tl-none bg-muted px-4">
                <Loader2 className="h-3.5 w-3.5 animate-spin text-muted-foreground" />
                <span className="text-xs text-muted-foreground">Consultando el negocio…</span>
              </div>
            </div>
          )}
        </div>

        <div className="border-t border-border/60 p-3">
          <div className="flex items-end gap-2">
            <Textarea
              value={input}
              onChange={(event) => setInput(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === 'Enter' && !event.shiftKey) {
                  event.preventDefault()
                  send(input)
                }
              }}
              placeholder="Escribe tu pregunta (Enter para enviar, Shift+Enter para salto de línea)"
              rows={2}
              className="resize-none"
              disabled={loading}
            />
            <Button size="icon" onClick={() => send(input)} disabled={loading || !input.trim()} aria-label="Enviar mensaje">
              <Send className="h-4 w-4" />
            </Button>
          </div>
          <p className="mt-2 text-[11px] text-muted-foreground leading-relaxed">
            {status?.enabled
              ? 'Respuestas del modelo con datos en tiempo real del negocio. Si un agente se queda sin cuota, el sistema cambia automáticamente a otro.'
              : 'Configura la variable AI_PROVIDER_KEYS (JSON con una o varias claves de IA) en el entorno para habilitar el modelo completo.'}
          </p>
        </div>
      </CardContent>
    </Card>
  )
}

function MessageBubble({ message }: { message: ChatMessage }) {
  const isUser = message.role === 'user'

  return (
    <div className={cn('flex gap-2.5', isUser && 'justify-end')}>
      {!isUser && (
        <div className="mt-1 flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-primary/10 shadow-sm shadow-primary/10">
          <Bot className="h-4 w-4 text-primary" />
        </div>
      )}
      <div className={cn('max-w-[80%] min-w-0 space-y-1.5', isUser && 'flex flex-col items-end')}>
        <div
          className={cn(
            'rounded-2xl px-4 py-2.5 text-sm whitespace-pre-wrap break-words',
            isUser ? 'rounded-tr-none bg-primary text-primary-foreground' : 'rounded-tl-none bg-muted text-foreground',
          )}
        >
          {message.content}
        </div>
        {!isUser && message.meta && (message.meta.mode || message.meta.toolsUsed?.length) && (
          <div className="flex flex-wrap items-center gap-1.5 px-1">
            <Badge variant="outline" className="text-[10px] px-1.5 py-0 font-normal text-muted-foreground">
              {message.meta.mode === 'mock' ? 'Simulación' : message.meta.agentModel ?? 'IA'}
            </Badge>
            {message.meta.toolsUsed?.map((tool) => (
              <Badge key={tool} variant="secondary" className="text-[10px] px-1.5 py-0 font-normal">
                {TOOL_LABELS[tool] ?? tool}
              </Badge>
            ))}
          </div>
        )}
      </div>
      {isUser && (
        <div className="mt-1 flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-primary text-primary-foreground">
          <span className="text-[11px] font-bold">Tú</span>
        </div>
      )}
    </div>
  )
}