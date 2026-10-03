import http from 'k6/http'
import { check, group, sleep } from 'k6'
import { Counter, Rate, Trend } from 'k6/metrics'

// Métricas personalizadas
const rateLimitHits = new Counter('rate_limit_hits_429')
const serverErrors = new Counter('server_errors_5xx')
const catalogLatency = new Trend('catalog_duration_ms')
const searchLatency = new Trend('search_duration_ms')
const successRate = new Rate('successful_requests')

// Configuración de etapas de carga (Ramp-up, Carga sostenida, Spike y Cool-down)
export const options = {
  stages: [
    { duration: '20s', target: 10 }, // 1. Warm-up
    { duration: '40s', target: 30 }, // 2. Ramp-up a carga nominal
    { duration: '60s', target: 60 }, // 3. Carga sostenida
    { duration: '20s', target: 120 }, // 4. Spike de concurrencia
    { duration: '30s', target: 0 }, // 5. Cool-down / recuperación
  ],
  thresholds: {
    'http_req_duration{endpoint:settings}': ['p(95)<400'], // 95% de lecturas estáticas < 400ms
    'http_req_duration{endpoint:catalog}': ['p(95)<800'], // 95% de lecturas de catálogo < 800ms
    'http_req_duration{endpoint:search}': ['p(95)<900'], // 95% de búsquedas < 900ms
    catalog_duration_ms: ['p(95)<800'],
    search_duration_ms: ['p(95)<900'],
    server_errors_5xx: ['count==0'], // Ningún 500 aceptable
    successful_requests: ['rate>0.90'], // >90% de éxito (el resto pueden ser 429 bajo spike)
  },
}

const BASE_URL = __ENV.TARGET_URL || 'http://localhost:3000'

export default function () {
  const commonHeaders = {
    Accept: 'application/json',
    'User-Agent': 'k6-load-tester/1.0 (Tecnicell ERP Stress Suite)',
  }

  // 1. Lectura de Configuración de la Tienda (CDN / Edge Caching)
  group('1. Storefront Settings', () => {
    const res = http.get(`${BASE_URL}/api/web/settings`, {
      headers: commonHeaders,
      tags: { endpoint: 'settings' },
    })

    const isOk = check(res, {
      'settings status is 200': (r) => r.status === 200,
      'settings has data': (r) => r.body && r.body.includes('settings'),
    })

    if (res.status === 429) rateLimitHits.add(1)
    if (res.status >= 500) serverErrors.add(1)
    successRate.add(isOk)
  })

  sleep(0.2)

  // 2. Consulta del Catálogo de Productos (Paginación y Filtros)
  group('2. Catalog Browsing', () => {
    const page = Math.floor(Math.random() * 3) + 1
    const limit = 12
    const offset = (page - 1) * limit

    const res = http.get(`${BASE_URL}/api/web/products?limit=${limit}&offset=${offset}`, {
      headers: commonHeaders,
      tags: { endpoint: 'catalog' },
    })

    catalogLatency.add(res.timings.duration)

    const isOk = check(res, {
      'catalog status is 200 or 429': (r) => r.status === 200 || r.status === 429,
      'catalog response is json': (r) => r.headers['Content-Type']?.includes('application/json'),
    })

    if (res.status === 429) rateLimitHits.add(1)
    if (res.status >= 500) serverErrors.add(1)
    successRate.add(res.status === 200)
  })

  sleep(0.3)

  // 3. Búsqueda de Productos en Tiempo Real
  group('3. Product Search', () => {
    const searchTerms = ['combo', 'bateria', 'pantalla', 'cargador', 'a', 'vidrio']
    const term = searchTerms[Math.floor(Math.random() * searchTerms.length)]

    const res = http.get(`${BASE_URL}/api/web/search?q=${encodeURIComponent(term)}&limit=8`, {
      headers: commonHeaders,
      tags: { endpoint: 'search' },
    })

    searchLatency.add(res.timings.duration)

    const isOk = check(res, {
      'search status is 200 or 429': (r) => r.status === 200 || r.status === 429,
      'search response is valid': (r) => r.body && r.body.includes('products'),
    })

    if (res.status === 429) rateLimitHits.add(1)
    if (res.status >= 500) serverErrors.add(1)
    successRate.add(res.status === 200)
  })

  sleep(0.5)

  // 4. Creación Sintética de Mensaje de Contacto (Validación y Throttling de Escritura)
  group('4. Contact Form Submission', () => {
    const payload = JSON.stringify({
      name: 'Load Tester User',
      email: `tester_${Date.now()}@example.com`,
      phone: '3001234567',
      subject: 'Prueba de carga sintética',
      message: 'Mensaje de verificación de estabilidad y concurrencia del backend.',
    })

    const res = http.post(`${BASE_URL}/api/web/contact`, payload, {
      headers: Object.assign({}, commonHeaders, { 'Content-Type': 'application/json' }),
      tags: { endpoint: 'contact_write' },
    })

    const isExpected = check(res, {
      'contact write status is 200, 400 or 429': (r) => [200, 400, 429].includes(r.status),
      'never returns 500 on contact': (r) => r.status < 500,
    })

    if (res.status === 429) rateLimitHits.add(1)
    if (res.status >= 500) serverErrors.add(1)
    successRate.add(res.status === 200 || res.status === 429)
  })

  sleep(1)
}
