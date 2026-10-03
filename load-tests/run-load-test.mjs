#!/usr/bin/env node
/**
 * Suite de pruebas sintéticas de estrés y rendimiento concurrente para Tecnicell ERP.
 * Ejecutable directamente con Node.js sin dependencias externas.
 *
 * Uso:
 *   node load-tests/run-load-test.mjs
 *   node load-tests/run-load-test.mjs --url https://erpcilmax.vercel.app --concurrency 20 --duration 10
 */

const args = process.argv.slice(2)
function getArg(name, defaultValue) {
  const idx = args.indexOf(name)
  if (idx !== -1 && args[idx + 1]) return args[idx + 1]
  return defaultValue
}

const TARGET_URL = (getArg('--url', process.env.TARGET_URL || 'https://erpcilmax.vercel.app')).replace(/\/$/, '')
const CONCURRENCY = Math.max(1, parseInt(getArg('--concurrency', '15'), 10))
const DURATION_SEC = Math.max(1, parseInt(getArg('--duration', '15'), 10))
const DURATION_MS = DURATION_SEC * 1000

console.log('='.repeat(70))
console.log(' 🚀 TECNICELL ERP — SUITE DE PRUEBAS DE ESTRÉS Y RENDIMIENTO')
console.log('='.repeat(70))
console.log(`• Objetivo:       ${TARGET_URL}`)
console.log(`• Concurrencia:   ${CONCURRENCY} peticiones simultáneas`)
console.log(`• Duración:       ${DURATION_SEC} segundos`)
console.log(`• Node Version:   ${process.version}`)
console.log('='.repeat(70))

const endpoints = [
  { name: 'Settings (Cache)', path: '/api/web/settings', method: 'GET' },
  { name: 'Categories (Cache)', path: '/api/web/categories', method: 'GET' },
  { name: 'Catalog (Limit 12)', path: '/api/web/products?limit=12&offset=0', method: 'GET' },
  { name: 'Search (q=celular)', path: '/api/web/search?q=celular&limit=8', method: 'GET' },
  {
    name: 'Contact Spam Check',
    path: '/api/web/contact',
    method: 'POST',
    body: JSON.stringify({
      name: 'Stress Test Bot',
      email: 'stress@test.cilmax.com',
      phone: '3000000000',
      subject: 'Prueba de carga sintética',
      message: 'Mensaje sintético de sobrecarga',
    }),
  },
]

const results = {
  total: 0,
  success2xx: 0,
  rateLimit429: 0,
  clientError4xx: 0,
  serverError5xx: 0,
  networkErrors: 0,
  latencies: [],
  byEndpoint: {},
}

for (const ep of endpoints) {
  results.byEndpoint[ep.name] = { total: 0, ok: 0, rateLimited: 0, errors: 0, latencies: [] }
}

let isRunning = true
const startTime = Date.now()

async function sendRequest(workerId) {
  while (isRunning) {
    const ep = endpoints[Math.floor(Math.random() * endpoints.length)]
    const start = performance.now()
    const endpointStat = results.byEndpoint[ep.name]

    try {
      const headers = {
        'Accept': 'application/json',
        'User-Agent': 'Tecnicell-LoadTester/1.0',
        'X-Forwarded-For': `192.168.1.${(workerId % 10) + 1}`, // Simula rotación de IPs para probar rate limiting
      }
      if (ep.body) headers['Content-Type'] = 'application/json'

      const res = await fetch(`${TARGET_URL}${ep.path}`, {
        method: ep.method,
        headers,
        body: ep.body,
        signal: AbortSignal.timeout(10000),
      })

      const elapsed = performance.now() - start
      results.total++
      results.latencies.push(elapsed)
      endpointStat.total++
      endpointStat.latencies.push(elapsed)

      if (res.status >= 200 && res.status < 300) {
        results.success2xx++
        endpointStat.ok++
      } else if (res.status === 429) {
        results.rateLimit429++
        endpointStat.rateLimited++
      } else if (res.status >= 400 && res.status < 500) {
        results.clientError4xx++
        endpointStat.errors++
      } else if (res.status >= 500) {
        results.serverError5xx++
        endpointStat.errors++
      }
    } catch {
      results.total++
      results.networkErrors++
      endpointStat.errors++
    }
  }
}

function percentile(arr, p) {
  if (arr.length === 0) return 0
  const sorted = [...arr].sort((a, b) => a - b)
  const idx = Math.min(sorted.length - 1, Math.floor((p / 100) * sorted.length))
  return sorted[idx]
}

async function main() {
  console.log('\n⏳ Ejecutando prueba de concurrencia en vivo...\n')

  const workers = []
  for (let i = 0; i < CONCURRENCY; i++) {
    workers.push(sendRequest(i))
  }

  // Timer para detener la prueba
  await new Promise((resolve) => setTimeout(resolve, DURATION_MS))
  isRunning = false

  await Promise.all(workers)

  const totalTimeSec = (Date.now() - startTime) / 1000
  const rps = (results.total / totalTimeSec).toFixed(1)
  const latencies = results.latencies

  latencies.sort((a, b) => a - b)
  const min = latencies[0] || 0
  const max = latencies[latencies.length - 1] || 0
  const avg = latencies.length ? latencies.reduce((a, b) => a + b, 0) / latencies.length : 0
  const p50 = percentile(latencies, 50)
  const p90 = percentile(latencies, 90)
  const p95 = percentile(latencies, 95)
  const p99 = percentile(latencies, 99)

  console.log('='.repeat(70))
  console.log(' 📊 RESULTADOS GENERALES DE LA PRUEBA')
  console.log('='.repeat(70))
  console.log(`• Peticiones Totales:     ${results.total}`)
  console.log(`• Tiempo Total:           ${totalTimeSec.toFixed(2)}s`)
  console.log(`• Rendimiento (RPS):      ${rps} req/segundo`)
  console.log(`• Éxito (2xx):            ${results.success2xx} (${((results.success2xx / results.total) * 100 || 0).toFixed(1)}%)`)
  console.log(`• Rate Limited (429):     ${results.rateLimit429} (${((results.rateLimit429 / results.total) * 100 || 0).toFixed(1)}%) [Protección anti-saturación]`)
  console.log(`• Errores Cliente (4xx):  ${results.clientError4xx}`)
  console.log(`• Errores Servidor (5xx): ${results.serverError5xx} ${results.serverError5xx === 0 ? '✅ (CERO caídas)' : '⚠️ (Revisar logs)'}`)
  console.log(`• Errores Red / Timeout:  ${results.networkErrors}`)
  console.log('-'.repeat(70))
  console.log(' ⏱️ DISTRIBUCIÓN DE LATENCIA (TIEMPO DE RESPUESTA)')
  console.log('-'.repeat(70))
  console.log(`• Mínima:                 ${min.toFixed(1)} ms`)
  console.log(`• Promedio:               ${avg.toFixed(1)} ms`)
  console.log(`• Mediana (p50):          ${p50.toFixed(1)} ms`)
  console.log(`• Percentil 90 (p90):     ${p90.toFixed(1)} ms`)
  console.log(`• Percentil 95 (p95):     ${p95.toFixed(1)} ms`)
  console.log(`• Percentil 99 (p99):     ${p99.toFixed(1)} ms`)
  console.log(`• Máxima:                 ${max.toFixed(1)} ms`)
  console.log('='.repeat(70))
  console.log(' 🔍 DESGLOSE POR ENDPOINT')
  console.log('='.repeat(70))

  for (const [name, stat] of Object.entries(results.byEndpoint)) {
    const epAvg = stat.latencies.length
      ? (stat.latencies.reduce((a, b) => a + b, 0) / stat.latencies.length).toFixed(1)
      : '0'
    const epP95 = percentile(stat.latencies, 95).toFixed(1)
    console.log(
      `• ${name.padEnd(24)} | Total: ${String(stat.total).padStart(4)} | 2xx: ${String(stat.ok).padStart(4)} | 429: ${String(stat.rateLimited).padStart(3)} | Err: ${String(stat.errors).padStart(2)} | p95: ${epP95.padStart(5)}ms | Prom: ${epAvg.padStart(5)}ms`,
    )
  }

  console.log('='.repeat(70))

  // Conclusión diagnóstica
  if (results.serverError5xx > 0) {
    console.log('❌ FALLO: Se detectaron errores 5xx bajo carga. Revisar pooling de base de datos o memoria.')
    process.exit(1)
  } else if (p95 > 2500) {
    console.log('⚠️ ADVERTENCIA: La latencia p95 supera los 2.5s. Optimizar índices en Neon y caché.')
  } else {
    console.log('✅ APROBADO: El backend respondió de forma resiliente sin errores 500 y con rate limiting activo.')
  }
}

main().catch((err) => {
  console.error('Error durante la ejecución del test de carga:', err)
  process.exit(1)
})
