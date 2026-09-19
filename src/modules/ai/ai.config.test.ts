import { describe, expect, it } from 'vitest'
import { AI_PROVIDER_KEYS_ENV, getDefaultModel, loadAiConfig, normalizeAgentKeys } from './ai.config'
import { AiProviderError } from './ai.types'

describe('normalizeAgentKeys', () => {
  it('devuelve arreglo vacío sin variable', () => {
    expect(normalizeAgentKeys(undefined)).toEqual([])
    expect(normalizeAgentKeys(null)).toEqual([])
    expect(normalizeAgentKeys('')).toEqual([])
    expect(normalizeAgentKeys('   ')).toEqual([])
  })

  it('ignora JSON inválido', () => {
    expect(normalizeAgentKeys('{no es json')).toEqual([])
    expect(normalizeAgentKeys('"texto"')).toEqual([])
  })

  it('ignora arreglos vacíos o no-arreglos', () => {
    expect(normalizeAgentKeys('[]')).toEqual([])
    expect(normalizeAgentKeys('{"provider":"openai"}')).toEqual([])
    expect(normalizeAgentKeys('[1,2,3]')).toEqual([])
  })

  it('parsea agentes válidos y aplica modelo por defecto', () => {
    const agents = normalizeAgentKeys(
      JSON.stringify([
        { provider: 'openai', key: 'sk-1234567890abcdef' },
        { provider: 'anthropic', key: 'sk-ant-1234567890abcdef', model: 'claude-sonnet-4' },
      ]),
    )

    expect(agents).toHaveLength(2)
    expect(agents[0]).toEqual({
      provider: 'openai',
      key: 'sk-1234567890abcdef',
      model: getDefaultModel('openai'),
    })
    expect(agents[1].model).toBe('claude-sonnet-4')
    expect(agents[1].provider).toBe('anthropic')
  })

  it('soporta baseUrl personalizada quitando barras finales', () => {
    const agents = normalizeAgentKeys(
      JSON.stringify([{ provider: 'openai', key: 'sk-1234567890abcdef', baseUrl: 'https://api.openrouter.ai/v1/' }]),
    )
    expect(agents[0].baseUrl).toBe('https://api.openrouter.ai/v1')
  })

  it('filtra proveedores no soportados y claves demasiado cortas', () => {
    const agents = normalizeAgentKeys(
      JSON.stringify([
        { provider: 'ollama', key: 'sk-1234567890abcdef' },
        { provider: 'openai', key: 'corta' },
        { provider: 'google', key: 'AIzaSyx1234567890' },
      ]),
    )
    expect(agents).toEqual([
      { provider: 'google', key: 'AIzaSyx1234567890', model: getDefaultModel('google') },
    ])
  })
})

describe('loadAiConfig', () => {
  it('devuelve deshabilitado sin clave configurada', () => {
    const previous = process.env[AI_PROVIDER_KEYS_ENV]
    delete process.env[AI_PROVIDER_KEYS_ENV]
    try {
      expect(loadAiConfig()).toEqual({ enabled: false, agents: [] })
    } finally {
      if (previous !== undefined) process.env[AI_PROVIDER_KEYS_ENV] = previous
    }
  })

  it('devuelve habilitado con al menos un agente', () => {
    const previous = process.env[AI_PROVIDER_KEYS_ENV]
    process.env[AI_PROVIDER_KEYS_ENV] = JSON.stringify([{ provider: 'openai', key: 'sk-1234567890abcdef' }])
    try {
      const config = loadAiConfig()
      expect(config.enabled).toBe(true)
      expect(config.agents).toHaveLength(1)
    } finally {
      if (previous !== undefined) process.env[AI_PROVIDER_KEYS_ENV] = previous
      else delete process.env[AI_PROVIDER_KEYS_ENV]
    }
  })
})

describe('AiProviderError', () => {
  it('preserva código y mensaje', () => {
    const error = new AiProviderError('quota', 'Cuota agotada')
    expect(error).toBeInstanceOf(Error)
    expect(error.code).toBe('quota')
    expect(error.message).toBe('Cuota agotada')
  })
})