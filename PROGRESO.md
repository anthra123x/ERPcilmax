# PROGRESO — Integración CilMax tienda ⇄ ERP (gestion-inventario)

> Hilo vivo de la conexión entre la tienda (`cilmax`) y el ERP
> (`cilmaxinventario`). Guarda el estado del trabajo en curso para retomarlo
> sin perder contexto, siguiendo la metodología de commits progresivos.

## Objetivo

Sustituir el panel admin del storefront (Astro + Keystatic + Neon) gestionando
la tienda online desde el ERP. **Prioridad: estabilidad.** Se conecta primero
el catálogo vía API (fase estabilizadora) y al final se retira Neon/admin.

## Decisiones (usuario)

1. **Estrategia**: híbrido por etapa — catálogo por API primero; consolidar la
   BD conectando el ERP a la **BD Neon del storefront** en el **schema `erp`**
   (misma instancia `neondb`, el storefront queda en `public`). Supabase Auth
   se mantiene **solo como login** (`NEXT_PUBLIC_SUPABASE_*`). Datos reales del
   ERP anterior: "no / casi nada" → arranque limpio (sin migrar datos).
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
- **Base de datos**: el ERP corre sobre la **BD Neon del storefront** en el
  **schema `erp`** (`neondb`; pooler `?sslmode=require&pgbouncer=true&schema=erp`
  en `DATABASE_URL` y `DIRECT_URL`). El host directo de Neon no es alcanzable
  desde este entorno → `DIRECT_URL` usa el pooler también. Neon rechaza el
  startup param `-c search_path=…` → las consultas crudas califican `public.`
  explícitamente (el `src/` solo usa Prisma ORM, así que `search_path=erp` es
  seguro en runtime). Supabase queda solo para auth.
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

### Fase 3 — ERP: seeder + verificaciones ✅

- El dry-run del importador lee Neon de verdad: 3 categorías, 10 productos,
  2 mensajes, tema `#008a93/#d4af37`. Reseñas y pedidos: 0 en Neon.
- Ejecutado localmente contra la BD Neon **del storefront** (schema `erp`):
  1. `npm run db:push` ✅ — schema aplicado al schema `erp`.
  2. `npm run web:import --apply` ✅ — escritos en `erp`: 3 categorías,
     10 productos (slugs/precios/stock/visibilidad reales), 2 mensajes, theme.
     El seeder califica `public.*` para leer el catálogo del storefront.
- Verificación runtime ✅: con el dev del ERP corriendo,
  `GET /api/web/{products,categories,products/[handle],search,settings,reviews}`
  responden sobre `erp`; `POST /api/web/contact` insertó en `erp`; el
  storefront en modo ERP (`CATALOG_SOURCE=erp ERP_API_URL=http://127.0.0.1:3000`)
  sirve `/catalogo` y home con los productos/ajustes del ERP.
- **Atención**: `.env.local` tiene precedencia sobre `.env` en Next dev — ambos
  deben apuntar a Neon con `schema=erp` (ya alineados; Supabase solo auth).
  En deploy, actualizar `DATABASE_URL`/`DIRECT_URL` y NO incluir Supabase DB.

### Fase 3b — ERP: UI "Tienda online" ✅

- Área `/web` en el panel: productos web (visibilidad `webVisible`, destacado
  `webFeatured`, orden `webSortOrder`, galería), pedidos web → conversión a
  venta POS, mensajes de contacto, reseñas y ajustes de tema/WhatsApp.
- Nuevo módulo `src/modules/web/web.actions.ts` con Server Actions tras
  `requireAuth` (getters admin, updateWebProduct, addWebMedia, removeWebMedia,
  convertWebOrderToSale que reutiliza `createSale` pagando contado, cancel, leer/
  borrar mensajes, aprobar/ocultar/borrar reseñas, updateWebSettings).
- Schemas Zod en `src/lib/validations.ts`, helper `src/lib/slugify.ts` (con
  tests), y labels `getWebOrderStatus{Label,Color}`.
- 7 componentes cliente en `src/components/web/` + páginas `src/app/web/*`
  (overview, products, products/[id], orders, orders/[id], messages, reviews,
  settings) con `error.tsx`/`loading.tsx` por carpeta. `/web` protegido en
  `proxy.ts` y enlazado en el sidebar ("Tienda online").
- Flake de dev: `invalid type: unit value` (Prisma en Next webpack+WASM) mitigado
  con `serverExternalPackages: ['@prisma/client', '@prisma/engines', 'prisma']`;
  la verificación del runtime pasó 40/40 productos en estrés.
- Verificación ✅: typecheck, eslint (sin errores nuevos) y 120 tests vitest;
  build de producción compila todas las rutas `/web`.

### Fase 4 — Deprecación ✅ en curso (producción funcional)

- [x] **Consolidación de datos** (Fase 3/3b): ERP sobre schema `erp` de la BD
      Neon de la tienda; admin de tienda online completo en el ERP (catálogo,
      pedidos→venta POS, mensajes, reseñas, ajustes).
- [x] **Admin de tienda v1 en el ERP** (Fase 3b): cubre 100 % del alcance del
      admin Astro que se retirará (productos visibles, galería, pedidos,
      mensajes, reseñas, tema/WhatsApp).
- [x] **Pushear commits a GitHub**: `gestion-inventario` (8 commits) y `cilmax` (6 commits)
      pushados a `origin/main`; Vercel auto-buildea tras push.
- [x] **Variables de entorno en Vercel (ERP)**: `DATABASE_URL`, `DIRECT_URL`,
      `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`,
      `SUPABASE_SERVICE_ROLE_KEY`, `SENTRY_DSN` — seteadas en proyecto
      `gestion-inventario`. Build OK, runtime OK.
- [x] **Verificación de build/deploy en Vercel**: ERP `gestion-inventario-iobfhfb8q
      .vercel.app` → `GET /api/web/categories|products|search|settings` = 200;
      `/login` 200. `ssoProtection` deshabilitado (antes bloqueaba acceso).
- [x] **Storefront en producción apuntando al ERP**: `CATALOG_SOURCE=erp` y
      `ERP_API_URL=https://gestion-inventario-iobfhfb8q-andres-camilo-martinez-s-projects.vercel.app`
      seteados en proyecto `cilmax`; `/catalogo` y `/api/search` devuelven
      los 10 productos del ERP (theme #008a93/#d4af37).
- [x] **Retirar el admin Astro** de la tienda: `git rm -r admin/` (30 archivos),
      menos deps del `package.json` principal, sin enlaces en UI/sitemap.
      Commit tienda `c8c2f85`.
- [x] **Limpiar fallback/mocks** del storefront: `src/lib/medusa.ts` ahora es
      ERP-only (sin fallback a Neon ni mocks); `GET /api/orders` admin sigue en
      Neon legacy (uso interno).
- [x] **Proxy de pedidos**: `POST /api/orders` del shop reescribe el body al
      formato del ERP (`name→customerName`, `phone→customerPhone`, …) y reenvía a
      `POST <ERP_API_URL>/api/web/orders`. Verificado en producción: crea la
      orden con precio y total recalculados por el ERP.
- [ ] **Archivar Neon (schema `public`)**: conservar como fallback documentado
      o desactivar cuando el ERP sea la única fuente.

#### Bugs de producción corregidos (conversión pedido → venta)

Al probar el flujo real aparecieron 3 bugs que rompían **toda** venta y todo abono
(el panel de la tienda no podía convertir pedidos). Corregidos y verificados
end-to-end en producción:

- [x] `convertWebOrderToSale` enviaba `initialPayment`/`initialPaymentMethod`
      junto con `paymentMethod: 'CASH'`; `CreateSaleSchema.superRefine` los
      rechaza (el anticipo solo aplica a ventas a crédito). Commit `3e1f910`.
- [x] `createSale` exigía una fila en `system_settings` y lanzaba si faltaba;
      la tabla estaba vacía → ninguna venta funcionaba. Ahora se auto-crea con
      los defaults del schema (`3e1f910`).
- [x] `createSale`/`registerPayment` usaban `categoryId = ''` cuando no existía
      una categoría INCOME "Venta" → violaba `transactions_categoryId_fkey`.
      Ahora `resolveSalesIncomeCategory` la crea si falta; además se corrió
      `db:seed` (la BD no tenía **ninguna** categoría). Commit `1e3c4e8`.
- [x] Timeout de transacción global a 15s (`src/lib/prisma.ts`): el default de
      5s se agotaba contra el pooler de Neon y provocaba rollbacks.
- [x] **Verificación en producción**: pedido de prueba creado vía el proxy del
      shop → convertido en el panel → `status=CONVERTED`, `Sale` COMPLETED/CASH
      por 480 000 COP, stock 5→4, `system_settings` 0→1, 1 `Transaction`.
- Tests de regresión: `web.actions.test.ts` (4) y `sales.helpers.test.ts` (2);
      126 tests vitest en total, typecheck limpio.

> Nota: el ERP en Vercel está pinneado en `ERP_API_URL` de la tienda a un deploy
> concreto; conviene apuntarlo al alias estable (`gestion-inventario-liart.vercel.app`).

## Bloqueos

- Host directo de Neon no alcanzable desde esta máquina (`P1001`) → usar siempre
  el pooler (incluso en `DIRECT_URL`).
- Neon rechaza el startup param `options: -c search_path=…` → calificar `public.`
  en cualquier SQL crudo (el `src/` solo usa Prisma, sin riesgo).
- Identidad git local sin configurar → commits con `-c user.name/user.email`.

## Comandos útiles

```bash
# ERP (usa BD Neon schema `erp` vía .env / .env.local)
npm run test            # vitest
npm run typecheck
npm run db:push         # aplicar schema (al schema `erp`)
npm run web:import      # dry-run; --apply escribe en `erp` (lee `public.*`)

# Tienda
npx vitest run --coverage
npx astro check
```