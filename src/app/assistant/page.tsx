import { Bot } from 'lucide-react'
import { AssistantChat } from '@/components/assistant/assistant-chat'

export default function AssistantPage() {
  return (
    <div className="page-container py-6 space-y-6">
      <div className="flex items-center gap-3">
        <div className="rounded-xl bg-primary/10 p-2.5 shadow-sm shadow-primary/10">
          <Bot className="h-5 w-5 text-primary" />
        </div>
        <div>
          <h1 className="text-xl font-bold tracking-tight">Asistente IA</h1>
          <p className="text-sm text-muted-foreground">Tu asistente virtual con contexto general del negocio</p>
        </div>
      </div>

      <AssistantChat />
    </div>
  )
}