import { describe, it, expect } from 'vitest'
import { NextRequest } from 'next/server'
import { AppError } from './errors'
import {
  enforceRateLimit,
  getClientIp,
  handleApiError,
  isValidIp,
  json,
  parsePagination,
  readJsonBody,
} from './api-utils'

describe('isValidIp', () => {
  it('accepts IPv4 and IPv6 addresses', () => {
    expect(isValidIp('1.2.3.4')).toBe(true)
    expect(isValidIp('255.255.255.255')).toBe(true)
    expect(isValidIp('2001:0db8:85a3:0000:0000:8a2e:0370:7334')).toBe(true)
  })

  it('rejects malformed addresses and header-injection values', () => {
    expect(isValidIp('')).toBe(false)
    expect(isValidIp('999.1.1.1')).toBe(false)
    expect(isValidIp('1.2.3')).toBe(false)
    expect(isValidIp('1.2.3.4\nX-Injected: 1')).toBe(false)
    expect(isValidIp('abc')).toBe(false)
  })
})

describe('getClientIp', () => {
  it('takes the first address of x-forwarded-for', () => {
    const request = new NextRequest('http://localhost', { headers: { 'x-forwarded-for': '1.2.3.4, 10.0.0.1' } })
    expect(getClientIp(request)).toBe('1.2.3.4')
  })

  it('falls back to x-real-ip and then unknown', () => {
    const viaReal = new NextRequest('http://localhost', { headers: { 'x-real-ip': '9.9.9.9' } })
    expect(getClientIp(viaReal)).toBe('9.9.9.9')
    expect(getClientIp(new NextRequest('http://localhost'))).toBe('unknown')
  })

  it('ignores invalid x-forwarded-for values and falls back to x-real-ip', () => {
    const request = new NextRequest('http://localhost', {
      headers: { 'x-forwarded-for': 'not-an-ip', 'x-real-ip': '8.8.8.8' },
    })
    expect(getClientIp(request)).toBe('8.8.8.8')
  })

  it('returns unknown when every header is invalid', () => {
    const request = new NextRequest('http://localhost', {
      headers: { 'x-forwarded-for': 'evil, 1.2.3', 'x-real-ip': 'nope' },
    })
    expect(getClientIp(request)).toBe('unknown')
  })
})

describe('parsePagination', () => {
  const params = (query: string) => new URLSearchParams(query)

  it('uses defaults when no params are present', () => {
    expect(parsePagination(new URLSearchParams())).toEqual({ ok: true, limit: 36, offset: 0 })
  })

  it('clamps limit to [1, MAX_LIMIT] and offset to [0, MAX_OFFSET]', () => {
    expect(parsePagination(params('limit=500&offset=99999'))).toEqual({ ok: true, limit: 100, offset: 10000 })
    expect(parsePagination(params('limit=1&offset=-5'))).toEqual({ ok: true, limit: 1, offset: 0 })
  })

  it('rejects limit that is not a positive number (400 contract)', () => {
    expect(parsePagination(params('limit=0'))).toEqual({ ok: false, error: expect.stringContaining('limit') })
    expect(parsePagination(params('limit=-3'))).toEqual({ ok: false, error: expect.stringContaining('limit') })
    expect(parsePagination(params('limit=abc'))).toEqual({ ok: false, error: expect.stringContaining('limit') })
  })

  it('treats invalid offset as 0 instead of failing', () => {
    expect(parsePagination(params('offset=abc'))).toEqual({ ok: true, limit: 36, offset: 0 })
    expect(parsePagination(params('offset=0'))).toEqual({ ok: true, limit: 36, offset: 0 })
  })
})

describe('readJsonBody', () => {
  const jsonRequest = (body: string) =>
    new NextRequest('http://localhost/api/web/orders', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body,
    })

  it('returns 415 when Content-Type is not application/json', async () => {
    const request = new NextRequest('http://localhost/api/web/orders', {
      method: 'POST',
      headers: { 'content-type': 'text/plain' },
      body: '{}',
    })
    const result = await readJsonBody(request)
    expect(result.ok).toBe(false)
    if (!result.ok) expect(result.response.status).toBe(415)
  })

  it('returns 400 on malformed JSON', async () => {
    const result = await readJsonBody(jsonRequest('{not-json'))
    expect(result.ok).toBe(false)
    if (!result.ok) expect(result.response.status).toBe(400)
  })

  it('parses a valid JSON body', async () => {
    const result = await readJsonBody(jsonRequest('{"customerName":"Ana"}'))
    expect(result.ok).toBe(true)
    if (result.ok) expect(result.body).toEqual({ customerName: 'Ana' })
  })
})

describe('handleApiError', () => {
  it('maps AppError to its own status and message', () => {
    const response = handleApiError(new AppError('Producto no encontrado', 'NOT_FOUND', 404), 'test')
    expect(response.status).toBe(404)
    expect(response.headers.get('content-type')).toContain('application/json')
  })

  it('maps known Prisma errors through handlePrismaError', () => {
    const response = handleApiError({ code: 'P2002', message: 'unique' }, 'test')
    expect(response.status).toBe(409)
  })

  it('falls back to a generic 500 for unexpected errors', () => {
    const response = handleApiError(new Error('boom'), 'test')
    expect(response.status).toBe(500)
  })
})

describe('enforceRateLimit', () => {
  const request = (ip: string) =>
    new NextRequest('http://localhost', { headers: { 'x-forwarded-for': ip } })

  it('returns null while requests stay within the limit', () => {
    for (let i = 0; i < 10; i++) {
      expect(enforceRateLimit(request('10.0.0.1'))).toBeNull()
    }
  })

  it('returns a 429 response once the limit is exceeded', () => {
    for (let i = 0; i < 120; i++) enforceRateLimit(request('10.0.0.2'))
    const blocked = enforceRateLimit(request('10.0.0.2'))
    expect(blocked).not.toBeNull()
    expect(blocked!.status).toBe(429)
    expect(blocked!.headers.get('Retry-After')).toBeTruthy()
  })

  it('tracks read and write limits independently', () => {
    for (let i = 0; i < 15; i++) {
      expect(enforceRateLimit(request('10.0.0.3'), true)).toBeNull()
    }
    expect(enforceRateLimit(request('10.0.0.3'), true)!.status).toBe(429)
    expect(enforceRateLimit(request('10.0.0.3'))).toBeNull()
  })
})

describe('json', () => {
  it('serializes a payload with NextResponse.json', () => {
    const response = json({ ok: true })
    expect(response.status).toBe(200)
    expect(response.headers.get('content-type')).toContain('application/json')
  })
})