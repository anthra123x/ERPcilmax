export type AiProviderId = 'openai' | 'anthropic' | 'google' | 'mock'

export const REAL_AI_PROVIDERS: AiProviderId[] = ['openai', 'anthropic', 'google']

export interface AiAgentKey {
  provider: AiProviderId
  key: string
  model: string
  baseUrl?: string
}

export interface AiConfigState {
  enabled: boolean
  agents: AiAgentKey[]
}

export interface AssistantMessage {
  role: 'system' | 'user' | 'assistant'
  content: string
}

export type AiFailureCode =
  | 'quota'
  | 'rate_limit'
  | 'auth'
  | 'network'
  | 'bad_request'
  | 'all_failed'
  | 'no_keys'

export class AiProviderError extends Error {
  readonly code: AiFailureCode

  constructor(code: AiFailureCode, message: string) {
    super(message)
    this.name = 'AiProviderError'
    this.code = code
  }
}

export type AssistantToolName =
  | 'get_business_snapshot'
  | 'get_sales_summary'
  | 'get_inventory_status'
  | 'get_web_orders_status'
  | 'get_recent_sales'
  | 'get_client_summary'
  | 'get_pending_credit'
  | 'get_contact_messages'
  | 'get_finance_summary'

export interface AssistantToolResult<T = Record<string, unknown>> {
  name: AssistantToolName
  data: T
  summary: string
  executedAt: string
}

export interface AssistantTurnResult {
  reply: string
  mode: 'ai' | 'mock'
  agent?: { provider: AiProviderId; model?: string }
  toolsUsed: AssistantToolName[]
  durationMs: number
  askedAt: string
}

export interface AssistantStatus {
  enabled: boolean
  agents: Array<{ provider: AiProviderId; model?: string }>
  mockActive: boolean
}