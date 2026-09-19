import { beforeEach, describe, expect, it, vi } from 'vitest'
import { AiProviderError } from './ai.types'
import type { AiAgentKey, AiProviderId } from './ai.types'
import {
  completeWithRotation,
  getAgentId,
  isAgentOnCooldown,
  resetAiRotationState,
} from './ai.rotation'

function makeAgent(provider: AiProviderId, model = 'test-model'): AiAgentKey {
  return { provider, key: `fake-key-${provider}-123456`, model }
}

function fakeResponse(status: number, body: unknown): Response {
  return {
    ok: status >= 200 && status < 300,
    status,
    json: async () => body,
    text: async () => JSON.stringify(body),
  } as unknown as Response
}

function openaiSuccess(text: string): Response {
  return fakeResponse(200, { choices: [{ message: { content: text } }] })
}

describe('completeWithRotation', () => {
  beforeEach(() => {
    resetAiRotationState()
    vi.restoreAllMocks()
  })

  it('usa el primer agente si responde bien', async () => {
    const fetcher = vi.fn().mockResolvedValue(openaiSuccess('{"text":"hola"}'))
    const agentA = makeAgent('openai')

    const result = await completeWithRotation({
      system: 'sys',
      messages: [{ role: 'user', content: 'hola' }],
      agents: [agentA],
      fetcher,
    })

    expect(result.text).toBe('{"text":"hola"}')
    expect(result.agent.provider).toBe('openai')
    expect(fetcher).toHaveBeenCalledTimes(1)
  })

  it('cambia al siguiente agente cuando el primero agota la cuota (429 insufficient_quota)', async () => {
    const fetcher = vi
      .fn()
      .mockResolvedValueOnce(fakeResponse(429, { error: { message: 'insufficient_quota' } }))
      .mockResolvedValueOnce(openaiSuccess('{"text":"respuesta del agente B"}'))

    const agentA = makeAgent('openai', 'modelo-a')
    const agentB = makeAgent('openai', 'modelo-b')

    const result = await completeWithRotation({
      system: 'sys',
      messages: [{ role: 'user', content: 'pregunta' }],
      agents: [agentA, agentB],
      fetcher,
    })

    expect(result.text).toBe('{"text":"respuesta del agente B"}')
    expect(result.agent.model).toBe('modelo-b')
    expect(fetcher).toHaveBeenCalledTimes(2)
    expect(isAgentOnCooldown(agentA)).toBe(true)
  })

  it('pone al agente en cooldown tras un error de autenticación', async () => {
    const fetcher = vi
      .fn()
      .mockResolvedValueOnce(fakeResponse(401, { error: { message: 'invalid api key' } }))
      .mockResolvedValueOnce(openaiSuccess('ok'))

    const agentA = makeAgent('openai', 'modelo-a')
    const agentB = makeAgent('openai', 'modelo-b')

    await completeWithRotation({
      system: 'sys',
      messages: [{ role: 'user', content: 'x' }],
      agents: [agentA, agentB],
      fetcher,
    })

    expect(isAgentOnCooldown(agentA)).toBe(true)
    expect(isAgentOnCooldown(agentB)).toBe(false)
  })

  it('salta agentes en cooldown y usa los disponibles', async () => {
    const fetcher = vi
      .fn()
      .mockResolvedValueOnce(fakeResponse(429, { error: { message: 'insufficient_quota' } }))
      .mockResolvedValueOnce(openaiSuccess('A falló'))
      .mockResolvedValueOnce(openaiSuccess('C responde'))

    const agentA = makeAgent('openai', 'a')
    const agentB = makeAgent('openai', 'b')
    const agentC = makeAgent('openai', 'c')

    // priming: A se queda sin cuota en este turno
    const first = await completeWithRotation({
      system: 'sys',
      messages: [{ role: 'user', content: 'x' }],
      agents: [agentA, agentB, agentC],
      fetcher,
    })
    expect(first.agent.model).toBe('b')

    // segundo turno: A en cooldown, B responde
    fetcher.mockClear()
    fetcher.mockResolvedValueOnce(openaiSuccess('B responde de nuevo'))
    const second = await completeWithRotation({
      system: 'sys',
      messages: [{ role: 'user', content: 'y' }],
      agents: [agentA, agentB, agentC],
      fetcher,
    })
    expect(second.agent.model).toBe('b')
    expect(isAgentOnCooldown(agentA)).toBe(true)
  })

  it('falla con all_failed cuando todos los agentes fallan', async () => {
    const fetcher = vi
      .fn()
      .mockResolvedValueOnce(fakeResponse(429, { error: { message: 'insufficient_quota' } }))
      .mockResolvedValueOnce(fakeResponse(500, {}))

    await expect(
      completeWithRotation({
        system: 'sys',
        messages: [{ role: 'user', content: 'x' }],
        agents: [makeAgent('openai'), makeAgent('openai')],
        fetcher,
      }),
    ).rejects.toMatchObject({ code: 'all_failed' })
  })

  it('lanza no_keys sin agentes', async () => {
    await expect(
      completeWithRotation({ system: 'sys', messages: [{ role: 'user', content: 'x' }], agents: [] }),
    ).rejects.toBeInstanceOf(AiProviderError)
  })
})

describe('getAgentId', () => {
  it('distingue claves y modelos', () => {
    const a = makeAgent('openai', 'm1')
    const b = makeAgent('openai', 'm1')
    const c = makeAgent('openai', 'm2')

    expect(getAgentId(a)).toBe(getAgentId(b))
    expect(getAgentId(a)).not.toBe(getAgentId(c))
  })
})