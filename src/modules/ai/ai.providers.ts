import { AiProviderError } from './ai.types'
import type { AiAgentKey, AssistantMessage } from './ai.types'

export interface CompletionOptions {
  temperature?: number
  maxTokens?: number
  fetcher?: typeof fetch
  signal?: AbortSignal
}

const TIMEOUT_MS = 45_000

function buildSignal(external?: AbortSignal): AbortSignal {
  const timeout = AbortSignal.timeout(TIMEOUT_MS)
  return external ? AbortSignal.any([external, timeout]) : timeout
}

function getSystemContent(messages: AssistantMessage[]): string {
  return messages.filter((m) => m.role === 'system').map((m) => m.content).join('\n')
}

function getUserMessages(messages: AssistantMessage[]): Array<{ role: 'user' | 'assistant'; content: string }> {
  return messages
    .filter((m) => m.role !== 'system')
    .map((m) => ({ role: m.role as 'user' | 'assistant', content: m.content }))
}

async function throwFromResponse(res: Response, provider: string): Promise<never> {
  let bodyText = ''
  try {
    bodyText = JSON.stringify(await res.json()).slice(0, 400)
  } catch {
    bodyText = await res.text().catch(() => '')
  }

  if (res.status === 401 || res.status === 403) {
    throw new AiProviderError('auth', `Credenciales inválidas (${provider} ${res.status}): ${bodyText}`)
  }
  if (res.status === 429) {
    const lower = bodyText.toLowerCase()
    if (lower.includes('insufficient') || lower.includes('quota') || lower.includes('quotaexceeded')) {
      throw new AiProviderError('quota', `Cuota agotada (${provider} 429): ${bodyText}`)
    }
    throw new AiProviderError('rate_limit', `Límite de peticiones (${provider} 429): ${bodyText}`)
  }
  if (res.status === 529) {
    throw new AiProviderError('rate_limit', `Servicio sobrecargado (${provider} 529): ${bodyText}`)
  }
  if (res.status >= 500) {
    throw new AiProviderError('network', `Error del servidor (${provider} ${res.status}): ${bodyText}`)
  }
  throw new AiProviderError('bad_request', `Petición rechazada (${provider} ${res.status}): ${bodyText}`)
}

async function completeOpenAI(
  agent: AiAgentKey,
  messages: AssistantMessage[],
  opts: Required<Pick<CompletionOptions, 'temperature' | 'maxTokens'>> & CompletionOptions,
): Promise<string> {
  const fetcher = opts.fetcher ?? fetch
  const base = agent.baseUrl ?? 'https://api.openai.com/v1'
  const system = getSystemContent(messages)

  const res = await fetcher(`${base}/chat/completions`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${agent.key}`,
    },
    body: JSON.stringify({
      model: agent.model,
      messages: [...(system ? [{ role: 'system', content: system }] : []), ...getUserMessages(messages)],
      temperature: opts.temperature,
      max_tokens: opts.maxTokens,
    }),
    signal: buildSignal(opts.signal),
  })

  if (!res.ok) await throwFromResponse(res, 'openai')

  const data = (await res.json()) as { choices?: Array<{ message?: { content?: string } }> }
  const text = data.choices?.[0]?.message?.content
  if (typeof text !== 'string' || !text.trim()) {
    throw new AiProviderError('bad_request', 'Respuesta vacía del proveedor (openai)')
  }
  return text.trim()
}

async function completeAnthropic(
  agent: AiAgentKey,
  messages: AssistantMessage[],
  opts: Required<Pick<CompletionOptions, 'temperature' | 'maxTokens'>> & CompletionOptions,
): Promise<string> {
  const fetcher = opts.fetcher ?? fetch
  const base = agent.baseUrl ?? 'https://api.anthropic.com/v1'
  const system = getSystemContent(messages)

  const res = await fetcher(`${base}/messages`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': agent.key,
      'anthropic-version': '2023-06-01',
    },
    body: JSON.stringify({
      model: agent.model,
      ...(system ? { system } : {}),
      messages: getUserMessages(messages),
      max_tokens: opts.maxTokens,
      temperature: opts.temperature,
    }),
    signal: buildSignal(opts.signal),
  })

  if (!res.ok) await throwFromResponse(res, 'anthropic')

  const data = (await res.json()) as { content?: Array<{ type: string; text?: string }> }
  const text = data.content?.find((block) => block.type === 'text')?.text
  if (typeof text !== 'string' || !text.trim()) {
    throw new AiProviderError('bad_request', 'Respuesta vacía del proveedor (anthropic)')
  }
  return text.trim()
}

async function completeGoogle(
  agent: AiAgentKey,
  messages: AssistantMessage[],
  opts: Required<Pick<CompletionOptions, 'temperature' | 'maxTokens'>> & CompletionOptions,
): Promise<string> {
  const fetcher = opts.fetcher ?? fetch
  const model = agent.model
  const system = getSystemContent(messages)

  const res = await fetcher(
    `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${agent.key}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        ...(system ? { systemInstruction: { parts: [{ text: system }] } } : {}),
        contents: getUserMessages(messages).map((m) => ({
          role: m.role === 'assistant' ? 'model' : 'user',
          parts: [{ text: m.content }],
        })),
        generationConfig: { temperature: opts.temperature, maxOutputTokens: opts.maxTokens },
      }),
      signal: buildSignal(opts.signal),
    },
  )

  if (!res.ok) await throwFromResponse(res, 'google')

  const data = (await res.json()) as {
    candidates?: Array<{ content?: { parts?: Array<{ text?: string }> } }>
  }
  const text = data.candidates?.[0]?.content?.parts?.map((p) => p.text ?? '').join('')
  if (typeof text !== 'string' || !text.trim()) {
    throw new AiProviderError('bad_request', 'Respuesta vacía del proveedor (google)')
  }
  return text.trim()
}

export async function completeChat(
  agent: AiAgentKey,
  messages: AssistantMessage[],
  opts: CompletionOptions = {},
): Promise<string> {
  const options = {
    ...opts,
    temperature: opts.temperature ?? 0.3,
    maxTokens: opts.maxTokens ?? 1200,
  }

  try {
    switch (agent.provider) {
      case 'openai':
        return await completeOpenAI(agent, messages, options)
      case 'anthropic':
        return await completeAnthropic(agent, messages, options)
      case 'google':
        return await completeGoogle(agent, messages, options)
      default:
        throw new AiProviderError('bad_request', `Proveedor de IA no soportado: ${agent.provider}`)
    }
  } catch (error) {
    if (error instanceof AiProviderError) throw error
    throw new AiProviderError('network', error instanceof Error ? error.message : 'Error de red al llamar al proveedor de IA')
  }
}