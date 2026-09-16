# PROGRESO — Integración CilMax tienda ⇄ ERP (gestion-inventario)

> Hilo vivo de la conexión entre la tienda (`cilmax`) y el ERP
> (`cilmaxinventario`). Guarda el estado del trabajo en curso para retomarlo
> sin perder contexto, siguiendo la metodología de commits progresivos.

## Objetivo

Sustituir el panel admin del storefront (Astro + Keystatic + Neon) gestionando
la tienda online desde el ERP. **Prioridad: estabilidad.** Se conecta primero
el catálogo vía API (fase estabilizadora) y al final se retira Neon/admin.

## Decisiones (usuario)

1. **Estrategia**: híbrido por etapa — catálogo por API primero; evaluar en el
   futuro si conviene consolidar la BD. El ERP **no** migra a Neon (riesgo del
   Supabase Auth).
2. **Alcance v1 "Tienda online" del ERP**: todo (catálogo + ajustes, pedidos
   web, mensajes de contacto y reseñas).
3. **Flujo de pedido**: se mantiene WhatsApp + se registra el pedido en el ERP
   (`POST` fire-and-forget al pulsar "Comprar por WhatsApp"). Sin reserva de
   stock en v1.
4. **Imágenes**: galería múltiple en el ERP (`ProductMedia`, URLs públicas).

## Arquitectura

- **Fuente de verdad**: ERP (productos, stock, precios, pedidos web, mensajes,
  reseñas, ajustes). `Product.stock` = única fuente de stock (el storefront
  nunca escribe stock).
- **Storefront**: consume `/api/web/*` del ERP con caché TTL + fallback a
  Neon/mocks (nunca se rompe por el ERP). Enrutado por `CATALOG_SOURCE`
  (`erp` | `neon`).
- **Mapeo**: 1 producto ERP = 1 artículo web (variante única), `amount` =
  `salePrice` en pesos enteros (COP 0 decimales). `handle` = `slug` del ERP.
- Al final: Neon se archiva, admin Astro se depreca.

## Estado (fechado)

### Fase 1 — ERP: schema + API pública ✅ (committeada)

Commits en `main` del ERP:
- `adea778` — schema web: campos `Product` (slug, webVisible, webFeatured,
  webSortOrder, webDescription) + `ProductMedia`, `ProductReview`, `WebOrder`/
  `WebOrderItem`, `ContactMessage`, `StoreSetting`, enum `WebOrderStatus`,
  relación `Sale.webOrders`.
- `0f9dcb9` — `ProductCategory.slug` (único).
- `e7b1cdf` — API pública `/api/web/*` (products, products/[handle], categories,
  search, reviews, contact, orders, settings) con rate-limit por IP, re-preciado
  de pedidos en el servidor e integridad.
- `849aa91` — contacto admite mensajes hasta 4200 chars (alineado con el form).
- `76d2f88` — importador `prisma/web-import.ts` (`npm run web:import`).

Verde: 111+ tests, `typecheck`, `build`, ESLint en archivos nuevos.

### Fase 2 — Tienda: cliente ERP con fallback ✅ (committeada)

Commit en `main` de la tienda:
- `761cbd7` — `src/lib/store-client.ts` (timeout ~3s, caché TTL 60s, flag
  `CATALOG_SOURCE`/`ERP_API_URL`); `medusa.ts` intenta primero el ERP; APIs de
  reseñas/contacto escriben al ERP en modo `erp`; filtro de catálogo por
  **slug** de categoría (antes id numérico).
- 27 tests verdes, cobertura ≥80 % en `search.ts`/`reviews.ts`, `astro check`
  0 errores.

### Fase 3 — ERP: seeder + verificaciones

- El dry-run del importador lee Neon de verdad: 3 categorías, 10 productos,
  2 mensajes, tema `#008a93/#d4af37`. Reseñas y pedidos: 0 en Neon.
- **Pendiente de ejecutar del lado del usuario** (BD Supabase del ERP no es
  alcanzable desde esta máquina — error `P1001`):
  1. `npm run db:push` (aplica el schema nuevo).
  2. `NEON_DATABASE_URL=… npm run web:import` (dry-run) y luego `--apply`.

### Fase 3b — ERP: UI "Tienda online" ⏳ pendiente

- Área de gestión en el panel (productos web: visibilidad, destacado, orden,
  galería; pedidos web → conversión a venta POS; mensajes; reseñas; ajustes de
  tema/WhatsApp). Server Actions tras `requireAuth` + tests.

### Fase 4 — Deprecación ⏳ pendiente

- Retirar admin Astro, archivar Neon, limpiar fallback, evaluar consolidación.

## Bloqueos

- BD Supabase **del ERP inalcanzable** desde esta máquina (`P1001`, whitelist
  de IP). `db:push` y el `--apply` del seeder deben correr donde sí llegue a
  Supabase (máquina del usuario o deploy). La BD Neon **sí** es alcanzable
  (el dry-run la lee).
- Identidad git local sin configurar → commits con `-c user.name/user.email`.

## Comandos útiles

```bash
# ERP
npm run test            # vitest
npm run typecheck
npm run db:push         # aplicar schema (requiere alcance a Supabase)
NEON_DATABASE_URL=... npm run web:import [--apply]

# Tienda
npx vitest run --coverage
npx astro check
```