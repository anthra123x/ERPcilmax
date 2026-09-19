'use server'

import { requireAuth } from '@/modules/auth/auth.actions'
import { loadAiConfig } from './ai.config'
import type { AssistantHistoryItem } from './ai.service'
import { runAssistantTurn } from './ai.service'
import type { AssistantStatus, AssistantTurnResult } from './ai.types'

export async function chatWithAssistant(input: {
  message: string
  history?: AssistantHistoryItem[]
}): Promise<AssistantTurnResult> {
  await requireAuth()

  const message = typeof input?.message === 'string' ? input.message.trim() : ''
  if (!message) throw new Error('Escribe un mensaje para el asistente')
  if (message.length > 2000) throw new Error('El mensaje es muy largo (máximo 2000 caracteres)')

  const history: AssistantHistoryItem[] = Array.isArray(input.history)
    ? input.history
        .filter(
          (h): h is AssistantHistoryItem =>
            !!h && (h.role === 'user' || h.role === 'assistant') && typeof h.content === 'string',
        )
        .slice(-8)
    : []

  return await runAssistantTurn({ message, history })
}

export async function getAssistantStatus(): Promise<AssistantStatus> {
  await requireAuth()
  const config = loadAiConfig()
  return {
    enabled: config.enabled,
    agents: config.agents.map((a) => ({ provider: a.provider, model: a.model })),
    mockActive: !config.enabled,
  }
}