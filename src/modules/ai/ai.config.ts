import { REAL_AI_PROVIDERS } from './ai.types'
import type { AiAgentKey, AiConfigState, AiProviderId } from './ai.types'

export const AI_PROVIDER_KEYS_ENV = 'AI_PROVIDER_KEYS'

const DEFAULT_MODELS: Record<Exclude<AiProviderId, 'mock'>, string> = {
  openai: 'gpt-4o-mini',
  anthropic: 'claude-3-5-haiku-20241022',
  google: 'gemini-1.5-flash',
}

export function getDefaultModel(provider: AiProviderId): string {
  return DEFAULT_MODELS[provider as Exclude<AiProviderId, 'mock'>] || 'gpt-4o-mini'
}

function isRealProvider(provider: unknown): provider is Exclude<AiProviderId, 'mock'> {
  return typeof provider === 'string' && REAL_AI_PROVIDERS.includes(provider as AiProviderId)
}

export function normalizeAgentKeys(raw: string | null | undefined): AiAgentKey[] {
  if (!raw || !raw.trim()) return []

  let parsed: unknown
  try {
    parsed = JSON.parse(raw)
  } catch {
    return []
  }

  if (!Array.isArray(parsed)) return []

  const agents: AiAgentKey[] = []
  for (const item of parsed) {
    if (!item || typeof item !== 'object') continue
    const record = item as Record<string, unknown>

    if (!isRealProvider(record.provider)) continue
    if (typeof record.key !== 'string' || record.key.trim().length < 8) continue

    const model =
      typeof record.model === 'string' && record.model.trim()
        ? record.model.trim()
        : getDefaultModel(record.provider)

    const baseUrl =
      typeof record.baseUrl === 'string' && record.baseUrl.trim()
        ? record.baseUrl.trim().replace(/\/+$/, '')
        : undefined

    agents.push({ provider: record.provider, key: record.key.trim(), model, ...(baseUrl ? { baseUrl } : {}) })
  }

  return agents
}

export function loadAiConfig(): AiConfigState {
  const agents = normalizeAgentKeys(process.env[AI_PROVIDER_KEYS_ENV])
  return { enabled: agents.length > 0, agents }
}

export function getAgentLabel(agent: AiAgentKey): string {
  return `${agent.provider} · ${agent.model}`
}