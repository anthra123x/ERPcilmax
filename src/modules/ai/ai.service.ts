import { loadAiConfig } from './ai.config'
import { buildSystemPrompt, collectBusinessData } from './ai.context'
import { runMockAssistant } from './ai.mock'
import { completeWithRotation } from './ai.rotation'
import { isAssistantToolName, runAssistantTool } from './ai.tools'
import { AiProviderError } from './ai.types'
import type { AiProviderId, AssistantMessage, AssistantToolName, AssistantTurnResult } from './ai.types'

const MAX_HISTORY_MESSAGES = 8
const MAX_TOOL_ROUNDS = 2
const MAX_RESULT_CHARS = 4000

export interface AssistantHistoryItem {
  role: 'user' | 'assistant'
  content: string
}

function parseAssistantDecision(text: string): { text?: string; tool?: string; args?: Record<string, unknown> } | null {
  const cleaned = text.replace(/^```(?:json)?\s*/i, '').replace(/```\s*$/, '').trim()
  if (!cleaned) return null

  try {
    const parsed = JSON.parse(cleaned)
    if (parsed && typeof parsed === 'object') return parsed as { text?: string; tool?: string; args?: Record<string, unknown> }
  } catch {
    // no es JSON puro, intentamos extraer el primer objeto
  }

  const match = cleaned.match(/\{[\s\S]*\}/)
  if (!match) return null
  try {
    return JSON.parse(match[0]) as { text?: string; tool?: string; args?: Record<string, unknown> }
  } catch {
    return null
  }
}

function uniqueTools(tools: AssistantToolName[]): AssistantToolName[] {
  return [...new Set(tools)]
}

async function runRealAgent(
  system: string,
  userMessage: string,
  history: AssistantMessage[],
): Promise<{ reply: string; toolsUsed: AssistantToolName[]; agent: { provider: AiProviderId; model?: string } }> {
  const toolsUsed: AssistantToolName[] = []
  let current: AssistantMessage[] = [...history, { role: 'user', content: userMessage }]
  let lastDecision: string | null = null

  for (let round = 0; round < 1 + MAX_TOOL_ROUNDS; round++) {
    const { text, agent } = await completeWithRotation({ system, messages: current })
    lastDecision = text
    const decision = parseAssistantDecision(text)
    const toolName = decision?.tool

    if (typeof toolName === 'string' && isAssistantToolName(toolName)) {
      toolsUsed.push(toolName)
      const result = await runAssistantTool(toolName, decision?.args ?? {})
      const serialized = JSON.stringify(result).slice(0, MAX_RESULT_CHARS)
      current = [
        ...current,
        { role: 'assistant' as const, content: text },
        {
          role: 'user' as const,
          content: `Resultado de la herramienta "${toolName}":\n${serialized}\n\nResponde al usuario en español, breve y concreto, basándote solo en estos datos. Si corresponde, usa la opción {"text":"..."}`,
        },
      ]
      continue
    }

    if (typeof decision?.text === 'string' && decision.text.trim()) {
      return { reply: decision.text.trim(), toolsUsed, agent: { provider: agent.provider, model: agent.model } }
    }

    if (typeof text === 'string' && text.trim()) {
      return { reply: text.trim(), toolsUsed, agent: { provider: agent.provider, model: agent.model } }
    }
  }

  return {
    reply: lastDecision?.trim() || 'No pude generar una respuesta clara. Inténtalo de nuevo.',
    toolsUsed,
    agent: { provider: 'openai' as AiProviderId, model: undefined },
  }
}

export async function runAssistantTurn(input: {
  message: string
  history?: AssistantHistoryItem[]
}): Promise<AssistantTurnResult> {
  const startedAt = Date.now()
  const askedAt = new Date().toISOString()
  const config = loadAiConfig()

  const history: AssistantMessage[] = (input.history ?? []).slice(-MAX_HISTORY_MESSAGES).map((h) => ({
    role: h.role,
    content: h.content,
  }))

  let reply: string | null = null
  let mode: 'ai' | 'mock' = config.enabled ? 'ai' : 'mock'
  let agent: AssistantTurnResult['agent']
  let toolsUsed: AssistantToolName[] = []

  if (config.enabled) {
    try {
      const snapshot = await collectBusinessData()
      const system = buildSystemPrompt(snapshot)
      const result = await runRealAgent(system, input.message, history)
      reply = result.reply
      toolsUsed = result.toolsUsed
      agent = result.agent
    } catch (error) {
      if (error instanceof AiProviderError && error.code === 'all_failed') {
        mode = 'mock'
      } else {
        throw error
      }
    }
  }

  if (!reply) {
    const mock = await runMockAssistant(input.message)
    reply = mock.reply
    toolsUsed = uniqueTools([...toolsUsed, ...mock.toolsUsed])
  }

  return { reply, mode, agent, toolsUsed: uniqueTools(toolsUsed), durationMs: Date.now() - startedAt, askedAt }
}