'use client'

import { useEffect, useRef, useState } from 'react'
import { Bot, Loader2, Send, Sparkles, X, ChevronDown, Maximize2, Minimize2 } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
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
  '¿Pedidos pendientes en la tienda?',
  '¿Cuánto deben a crédito?',
  'Resumen del negocio',
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

export function AiFloatingChat() {
  const [open, setOpen] = useState(false)
  const [expanded, setExpanded] = useState(false)
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [status, setStatus] = useState<AssistantStatus | null>(null)
  const [unread, setUnread] = useState(0)
  const scrollRef = useRef<HTMLDivElement>(null)
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  useEffect(() => {
    getAssistantStatus().then(setStatus).catch(() => setStatus(null))
  }, [])

  useEffect(() => {
    const el = scrollRef.current
    if (el) el.scrollTop = el.scrollHeight
  }, [messages, loading])

  useEffect(() => {
    if (open) {
      setUnread(0)
      setTimeout(() => textareaRef.current?.focus(), 200)
    }
  }, [open])

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
          meta: { mode: result.mode, agentModel: result.agent?.model, toolsUsed: result.toolsUsed },
        },
      ])
      if (!open) setUnread((n) => n + 1)
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

  const chatHeight = expanded ? 'h-[600px]' : 'h-[460px]'
  const chatWidth = expanded ? 'w-[480px]' : 'w-[380px]'

  return (
    <div className="fixed bottom-6 right-6 z-50 flex flex-col items-end gap-3">
      {/* Panel de chat */}
      <div
        className={cn(
          'flex flex-col rounded-2xl border border-border/60 bg-background shadow-2xl shadow-black/20 transition-all duration-300 ease-out',
          chatWidth,
          open ? 'opacity-100 translate-y-0 pointer-events-auto' : 'opacity-0 translate-y-4 pointer-events-none scale-95',
        )}
        style={{ maxHeight: expanded ? 640 : 520 }}
        aria-hidden={!open}
      >
        {/* Header */}
        <div className="flex items-center gap-3 border-b border-border/60 bg-muted/40 px-4 py-3 rounded-t-2xl">
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-primary/10 shadow-sm shadow-primary/10">
            <Bot className="h-4 w-4 text-primary" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold leading-tight">Asistente IA</p>
            <p className="text-[11px] text-muted-foreground truncate">
              {status?.enabled
                ? `IA activa · ${status.agents.length} agente${status.agents.length !== 1 ? 's' : ''}`
                : 'Modo simulación'}
            </p>
          </div>
          <div className="flex items-center gap-1">
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7 text-muted-foreground hover:text-foreground"
              onClick={() => setExpanded((e) => !e)}
              aria-label={expanded ? 'Minimizar' : 'Expandir'}
            >
              {expanded ? <Minimize2 className="h-3.5 w-3.5" /> : <Maximize2 className="h-3.5 w-3.5" />}
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7 text-muted-foreground hover:text-foreground"
              onClick={() => setOpen(false)}
              aria-label="Cerrar chat"
            >
              <ChevronDown className="h-3.5 w-3.5" />
            </Button>
          </div>
        </div>

        {/* Mensajes */}
        <div
          ref={scrollRef}
          className={cn('flex-1 overflow-y-auto space-y-3.5 p-4 transition-all duration-300', chatHeight)}
        >
          {messages.length === 0 && (
            <div className="flex h-full flex-col items-center justify-center text-center gap-4 px-4">
              <div className="rounded-2xl bg-primary/10 p-3 shadow-sm shadow-primary/10">
                <Sparkles className="h-6 w-6 text-primary" />
              </div>
              <div className="space-y-1">
                <p className="text-sm font-semibold">Pregúntale a tu negocio</p>
                <p className="text-xs text-muted-foreground max-w-xs text-pretty leading-relaxed">
                  Ventas, inventario, pedidos online, créditos y más — con datos en tiempo real.
                </p>
              </div>
              <div className="flex flex-col gap-1.5 w-full">
                {SUGGESTED_QUESTIONS.map((q) => (
                  <button
                    key={q}
                    onClick={() => send(q)}
                    disabled={loading}
                    className="w-full text-left rounded-xl border border-border/60 bg-muted/40 px-3 py-2 text-xs text-muted-foreground transition-colors hover:bg-muted hover:text-foreground hover:border-border disabled:opacity-50"
                  >
                    {q}
                  </button>
                ))}
              </div>
            </div>
          )}

          {messages.map((msg, index) => (
            <FloatingMessageBubble key={index} message={msg} />
          ))}

          {loading && (
            <div className="flex items-start gap-2">
              <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-xl bg-primary/10 shadow-sm">
                <Bot className="h-3.5 w-3.5 text-primary" />
              </div>
              <div className="flex h-7 items-center gap-1.5 rounded-xl rounded-tl-none bg-muted px-3">
                <Loader2 className="h-3 w-3 animate-spin text-muted-foreground" />
                <span className="text-[11px] text-muted-foreground">Consultando…</span>
              </div>
            </div>
          )}
        </div>

        {/* Input */}
        <div className="border-t border-border/60 p-3 rounded-b-2xl">
          <div className="flex items-end gap-2">
            <Textarea
              ref={textareaRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault()
                  send(input)
                }
              }}
              placeholder="Escribe tu pregunta… (Enter para enviar)"
              rows={2}
              className="resize-none text-sm min-h-[60px]"
              disabled={loading}
            />
            <Button
              size="icon"
              className="h-[60px] w-10 shrink-0"
              onClick={() => send(input)}
              disabled={loading || !input.trim()}
              aria-label="Enviar"
            >
              <Send className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>

      {/* Botón flotante */}
      <button
        onClick={() => setOpen((o) => !o)}
        aria-label={open ? 'Cerrar asistente IA' : 'Abrir asistente IA'}
        className={cn(
          'relative flex h-14 w-14 items-center justify-center rounded-full shadow-lg shadow-primary/25 transition-all duration-300 ease-out',
          'bg-primary text-primary-foreground hover:bg-primary/90 hover:scale-105 active:scale-95',
          open && 'rotate-45',
        )}
      >
        {open ? (
          <X className="h-5 w-5 transition-transform duration-200" />
        ) : (
          <Bot className="h-5 w-5 transition-transform duration-200" />
        )}
        {!open && unread > 0 && (
          <span className="absolute -top-1 -right-1 flex h-5 w-5 items-center justify-center rounded-full bg-destructive text-[10px] font-bold text-destructive-foreground shadow-sm">
            {unread}
          </span>
        )}
        {/* Pulse ring cuando hay IA activa */}
        {status?.enabled && !open && (
          <span className="absolute inset-0 rounded-full bg-primary/30 animate-ping opacity-75" />
        )}
      </button>
    </div>
  )
}

function FloatingMessageBubble({ message }: { message: ChatMessage }) {
  const isUser = message.role === 'user'

  return (
    <div className={cn('flex gap-2', isUser && 'justify-end')}>
      {!isUser && (
        <div className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-xl bg-primary/10 shadow-sm">
          <Bot className="h-3.5 w-3.5 text-primary" />
        </div>
      )}
      <div className={cn('max-w-[85%] min-w-0 space-y-1', isUser && 'flex flex-col items-end')}>
        <div
          className={cn(
            'rounded-2xl px-3 py-2 text-sm whitespace-pre-wrap break-words leading-relaxed',
            isUser
              ? 'rounded-tr-none bg-primary text-primary-foreground'
              : 'rounded-tl-none bg-muted text-foreground',
          )}
        >
          {message.content}
        </div>
        {!isUser && message.meta && (message.meta.mode || message.meta.toolsUsed?.length) && (
          <div className="flex flex-wrap items-center gap-1 px-1">
            <Badge variant="outline" className="text-[9px] px-1.5 py-0 h-4 font-normal text-muted-foreground">
              {message.meta.mode === 'mock' ? 'Simulación' : message.meta.agentModel ?? 'IA'}
            </Badge>
            {message.meta.toolsUsed?.map((tool) => (
              <Badge key={tool} variant="secondary" className="text-[9px] px-1.5 py-0 h-4 font-normal">
                {TOOL_LABELS[tool] ?? tool}
              </Badge>
            ))}
          </div>
        )}
      </div>
      {isUser && (
        <div className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-xl bg-primary text-primary-foreground">
          <span className="text-[10px] font-bold">Tú</span>
        </div>
      )}
    </div>
  )
}
