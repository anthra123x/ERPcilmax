import { describe, it, expect } from 'vitest'
import { createRateLimiter, RateLimitError } from './rate-limit'

describe('createRateLimiter', () => {
  it('allows requests within the limit', () => {
    const limiter = createRateLimiter({ limit: 3, windowMs: 60_000 })
    limiter.check('ip-1')
    limiter.check('ip-1')
    expect(() => limiter.check('ip-1')).not.toThrow()
  })

  it('throws RateLimitError once the limit is exceeded', () => {
    const limiter = createRateLimiter({ limit: 2, windowMs: 60_000 })
    limiter.check('ip-1')
    limiter.check('ip-1')
    expect(() => limiter.check('ip-1')).toThrow(RateLimitError)
  })

  it('tracks each key independently', () => {
    const limiter = createRateLimiter({ limit: 1, windowMs: 60_000 })
    limiter.check('a')
    expect(() => limiter.check('b')).not.toThrow()
    expect(() => limiter.check('a')).toThrow(RateLimitError)
  })

  it('resets the counter once the window expires', () => {
    let now = 1_000
    const limiter = createRateLimiter({ limit: 1, windowMs: 60_000, now: () => now })
    limiter.check('ip-1')
    expect(() => limiter.check('ip-1')).toThrow(RateLimitError)
    now = 1_000 + 60_001
    expect(() => limiter.check('ip-1')).not.toThrow()
  })
})