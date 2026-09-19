import { loadAiConfig } from './ai.config'
import { completeChat } from './ai.providers'
import { AiProviderError } from './ai.types'
import type { AiAgentKey, AiFailureCode, AssistantMessage } from './ai.types'

const COOLDOWN_MS: Partial<Record<AiFailureCode, number>> = {
  quota: 5 * 60 * 1000,
  rate_limit: 2 * 60 * 1000,
  auth: 30 * 60 * 1000,
  network: 15 * 1000,
  bad_request: 60 * 1000,
}

const cooldowns = new Map<string, number>()

export function resetAiRotationState(): void {
  cooldowns.clear()
}

export function getAgentId(agent: AiAgentKey): string {
  return `${agent.provider}::${agent.key}::${agent.model}`
}

export function isAgentOnCooldown(agent: AiAgentKey): boolean {
  const until = cooldowns.get(getAgentId(agent))
  return typeof until === 'number' && until > Date.now()
}

export function setAgentCooldown(agent: AiAgentKey, code: AiFailureCode): void {
  const ms = COOLDOWN_MS[code]
  if (ms) cooldowns.set(getAgentId(agent), Date.now() + ms)
}

export interface RotationResult {
  text: string
  agent: AiAgentKey
}

export async function completeWithRotation(input: {
  system: string
  messages: AssistantMessage[]
  agents?: AiAgentKey[]
  fetcher?: typeof fetch
}): Promise<RotationResult> {
  const agents = input.agents ?? loadAiConfig().agents

  if (agents.length === 0) {
    throw new AiProviderError('no_keys', 'No hay claves de IA configuradas')
  }

  const errors: string[] = []

  for (const agent of agents) {
    if (isAgentOnCooldown(agent)) continue
    const options = input.fetcher ? { fetcher: input.fetcher } : {}

    try {
      const text = await completeChat(agent, [{ role: 'system', content: input.system }, ...input.messages], options)
      return { text, agent }
    } catch (error) {
      const code = error instanceof AiProviderError ? error.code : ('network' as AiFailureCode)
      errors.push(`${agent.provider}:${code} — ${error instanceof Error ? error.message : String(error)}`)
      setAgentCooldown(agent, code)
    }
  }

  throw new AiProviderError('all_failed', `Todos los agentes de IA fallaron: ${errors.join(' | ')}`)
}