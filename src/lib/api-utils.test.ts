import { describe, it, expect } from 'vitest'
import { NextRequest } from 'next/server'
import { enforceRateLimit, getClientIp, json } from './api-utils'

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