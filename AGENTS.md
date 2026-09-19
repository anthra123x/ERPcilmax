<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

# Tecnicell ERP — Contexto Completo para el Agente

## Stack tecnológico

| Capa | Tecnología | Versión | Notas |
|------|-----------|---------|-------|
| Framework | Next.js (App Router) | 16.2.10 | Build con Webpack + WASM SWC |
| Language | TypeScript | 5.x | `strict: true` |
| Database | PostgreSQL (Neon) | - | Conexión directa `DIRECT_URL`; pooler PgBouncer para runtime |
| ORM | Prisma | 5.22 | Singleton en `@/lib/prisma` |
| CSS | Tailwind CSS | 4.x | `@tailwindcss/postcss`, `@theme inline` |
| UI Components | shadcn/ui + Base UI v1 | - | `base-nova` style, lucide icons |
| Auth | Supabase Auth (SSR) | - | `@supabase/ssr` + `proxy.ts` |
| Validation | Zod | 4.3.6 | Schemas en `@/lib/validations.ts` |
| Forms | react-hook-form | 7.72 | + `@hookform/resolvers` |
| Charts | Ninguno | - | Gráficos server-side; `recharts` instalado pero sin uso |
| PDF | @react-pdf/renderer | 4.9.0 | Facturas POS, estado de cuenta y recibos (`/print` + `/api/sales/*/pdf`) |
| Excel | xlsx (SheetJS) | 0.18.5 | Exportación de reportes |
| Testing | Vitest | 4.1.7 | 148 tests en 14 files |
| Lint | ESLint | 9.x | `eslint-config-next` + `unused-imports` |
| Format | Prettier | - | Config en `.prettierrc` |
| Monitoreo | @sentry/nextjs | 10.53.1 | Instalado; DSN en `.env` (dashboard sin activar) |

## Comandos esenciales

```bash
npm run dev         # Dev server (http://localhost:3000) + React Scan for rerenders (usa Webpack + WASM SWC)
npm run build       # Prisma generate + Next build (usa Webpack + WASM SWC)
npm run lint        # ESLint (incluye detección de imports muertos)
npm run typecheck   # TypeScript check sin emitir
npm run test        # Vitest (148 tests)
npm run db:push     # Sync schema a DB (dev)
npm run db:studio   # Prisma Studio
npm run db:migrate  # Crear migración
npm run db:seed     # Ejecutar seed
npx prettier --write src/  # Formatear todo el código
```

## Estructura del proyecto

```
src/
├── app/                    # Next.js App Router
│   ├── admin/              # Panel de administración (usuarios, settings, cleanup)
│   ├── api/                # API routes públicas (storefront, SIN auth)
│   │   ├── web/products/         # GET catálogo online (limit, offset, category, q)
│   │   ├── web/products/[handle]/ # GET por slug
│   │   ├── web/categories/       # GET categorías
│   │   ├── web/search/           # GET búsqueda
│   │   ├── web/reviews/          # GET posts que la API hace… (publicar reseñas)
│   │   ├── web/contact/          # POST mensaje de contacto
│   │   ├── web/settings/         # GET configuración tienda
│   │   ├── web/orders/           # POST crear pedido (storefront) — devuelve `order.reference` (ORD-XXXX)
│   │   └── sales/[id]/.../pdf    # PDF factura, estado de cuenta, recibo
│   ├── dashboard/          # Dashboard principal con stats
│   ├── web/                # Panel de administración de la tienda online
│   │   ├── page.tsx        # Resumen (productos visibles, por confirmar, en reserva, mensajes, reseñas)
│   │   ├── products/       # CRUD productos web (filtros, bulk, orden ↑↓, readiness)
│   │   ├── orders/         # Pedidos web: PENDING→CONFIRMED→CONVERTED/CANCELLED + referencia ORD
│   │   ├── reviews/        # Moderación de reseñas
│   │   ├── messages/       # Mensajes de contacto
│   │   └── settings/       # Configuración de la tienda
│   ├── inventory/          # CRUD productos, movimientos de stock
│   ├── login/              # Login con Supabase
│   ├── orders/             # Gestión de pedidos online
│   ├── print/              # Impresión de facturas (ruta unificada)
│   ├── profile/            # Perfil de usuario (datos reales de sesión)
│   ├── register/           # Redirige a /login (solo admin crea usuarios)
│   ├── repairs/            # CRUD reparaciones con partes
│   ├── reports/            # Reportes (ventas, inventario, reparaciones, clientes)
│   └── sales/              # POS ventas con carrito y descuentos
├── components/
│   ├── forms/              # Formularios complejos (sale-form, product-form)
│   ├── layout/             # Sidebar, Header, DashboardLayout
│   └── ui/                 # shadcn/ui + Base UI components (24 components)
├── lib/
│   ├── labels.ts           # Helpers compartidos (getPaymentMethodLabel, etc.)
│   ├── validations.ts      # Zod schemas de todos los módulos
│   ├── finance.ts          # Cálculos financieros (subtotal, profit, margin)
│   ├── format.ts           # Formateo moneda/fechas (COP)
│   ├── stock-check.ts      # Utilidades de verificación de stock
│   ├── keyboard-shortcuts.ts # Atajos de teclado POS
│   ├── zod-error.ts        # Helper para mensajes de error Zod
│   ├── supabase.ts         # Cliente Supabase browser
│   ├── supabase-server.ts  # Cliente Supabase server (logout)
│   ├── prisma.ts           # Prisma Client singleton
│   └── utils.ts            # cn() utility (clsx + tailwind-merge)
├── modules/
│   ├── auth/               # getCurrentUser, requireAdmin, requireAuth, CRUD usuarios
│   ├── cleanup/            # Backup/export y cleanup datos
│   ├── clients/            # CRUD clientes
│   ├── dashboard/          # Stats dashboard (ventas hoy, repairs ready, pedidos)
│   ├── web/                # Catálogo online CRUD + pedidos web (web.actions, web.service, web.helpers)
│   ├── inventory/          # Productos CRUD + movimientos stock (incl. RESERVATION/RELEASE)
│   ├── sales/              # Ventas POS + createSale (acepta `stockReserved`)
│   ├── reports/            # Reportes (ventas, inventario, reparaciones, clientes)
│   ├── settings/           # Configuración del sistema
│   └── ...                 # audit, finance, notifications, search, suppliers
├── proxy.ts                # Middleware Supabase Auth (detectado por Next.js 16 build)
├── middleware.ts            # NO EXISTE — proxy.ts hace el rol
└── next.config.ts           # CORS headers + bodySizeLimit 10mb
```

## Convenciones de código críticas

- **Server Actions**: `src/modules/<modulo>/<modulo>.actions.ts`, con `'use server'`
- **API Routes**: `src/app/api/<ruta>/route.ts`, públicas, SIN auth (para storefront)
- **Auth en Server Actions**: Toda action administrativa DEBE llamar `requireAdmin()` al inicio
- **Validación**: Siempre Zod, schemas en `@/lib/validations.ts`
- **Errores Prisma**: Capturar P2002 (unique), P2025 (not found), P2003 (FK)
- **Stock**: Siempre en `prisma.$transaction()` las operaciones que modifican stock
- **Moneda**: `formatCurrency()` de `@/lib/format` (COP)
- **Cálculos**: Helpers de `@/lib/finance` (calcSubtotal, calcTotal, calcProfit, calcMargin, etc.)
- **CSS**: Tailwind only, NO CSS modules, NO inline styles
- **Páginas**: Server Component por defecto, `'use client'` solo cuando necesitas interactividad
- **Labels**: Usar helpers de `@/lib/labels` en lugar de definir funciones locales duplicadas
- **Navegación**: Usar `router.push()` (NO `window.location.href`)
- **Delete**: Usar shadcn `Dialog` (NO `window.confirm()`)
- **Error boundaries**: Siempre tener `error.tsx` con `ErrorFallback` en cada ruta

## Reglas de negocio (NO ROMPER)

1. **`Product.stock` es la única fuente de verdad** — Storefront NUNCA escribe stock.
2. **`unitPrice >= purchasePrice`** — No se puede vender por debajo del costo.
3. **Reparaciones**: `cost` (mano de obra) debe ser >= `partsCost`.
4. **Stock se descuenta en PENDING→CONFIRMED**, no al crear el pedido.
5. **Soft delete**: Productos y clientes tienen `deletedAt`. Siempre filtrar `deletedAt: null`.
6. **Enums en UPPERCASE** en schema (DB tiene datos legacy en lowercase).
7. **Transiciones de orden**: Solo `ALLOWED_TRANSITIONS`. Stock se restaura si estado previo era ≥ CONFIRMED.
8. **API endpoints son públicos** — Sin auth en `/api/*` (el storefront los consume).
9. **Middleware**: `proxy.ts` usa Supabase SSR con `getAll()`/`setAll()` + `applyCookies()`.
10. **Pedidos web**: nace `PENDING` → `CONFIRMED` (descuenta stock con movimiento `RESERVATION`) → `CONVERTED`/`CANCELLED`. Cancelar un `CONFIRMED` restaura stock (`RELEASE`). Convertir no descuenta dos veces (`createSale` con `stockReserved: true`). Referencia legible `ORD-XXXX` desde `SystemSettings.nextWebOrderNumber`.

## Documentación compartida

Submodule en `docs/` → eliminado

**Leer primero:**
- `docs/docs/architecture/00-SYSTEM_OVERVIEW.md` — Visión general
- `docs/docs/architecture/01-SHARED_DATABASE.md` — Base de datos compartida
- `docs/docs/architecture/03-ORDER_FLOW.md` — Flujo de pedidos (crítico: stock side effects)

**Actualizar docs:**
```bash
cd docs && git add -A && git commit -m "mensaje" && git push origin main
cd .. && git add docs && git commit -m "docs: sync submodule" && git push
```

**Recibir cambios:**
```bash
git submodule update --remote docs && git add docs && git commit -m "docs: sync submodule" && git push
```

## Storefront integration

- Misma DB PostgreSQL en Neon (compartida)
- Storefront lee productos via `GET /api/web/products` (API pública)
- Storefront escribe pedidos via `POST /api/web/orders` (API pública, con validación de precios); el response incluye `order.reference` (ORD-XXXX)
- El pedido nace `PENDING` (sin reserva); el admin lo confirma en `/web/orders` y ahí se descuenta el stock
- Storefront NUNCA escribe stock, productos ni datos de la tienda

## Tooling disponible

| Herramienta | Para qué | Cómo usarlo |
|------------|----------|-------------|
| ESLint + unused-imports | Detecta imports/vars sin uso | `npm run lint` |
| Prettier | Formateo consistente | `npx prettier --write src/` |
| React Scan | Detecta rerenders innecesarios | Se activa SOLO en dev automáticamente |
| Vitest | Tests unitarios (77 tests) | `npm test` |
| TypeScript strict | Type safety | `npm run typecheck` |
| Zod 4 | Validación runtime | Schemas en `@/lib/validations.ts` |

## Dependencias eliminadas o inactivas

| Paquete | Razón |
|---------|-------|
| `@supabase/auth-helpers-nextjs` | Deprecado, reemplazado por `@supabase/ssr` |
| `jspdf` / `jspdf-autotable` | No se usaban (0 imports) |
| `pdf-lib` | No se usaba (0 imports) |
| `uuid` / `@types/uuid` | No se usaban (0 imports) |
| `recharts` | Instalado pero sin uso (gráficos server-side) |
| `shadcn` | Movido a devDependencies (es CLI, no runtime) |
| `gsap` | Instalado; usar solo si se agregan animaciones |

## Decisiones de arquitectura (NO cambiar sin autorización)

- **Float → Decimal**: Diferido (23 campos, requiere migration). Riesgo alto.
- **`any` types**: Aceptados como deuda técnica. Refactor masivo sin valor inmediato.
- **Sin TanStack Table**: Las tablas actuales (shadcn Table simple) cubren bien CRUDs. Reports no justifica la complejidad.
- **Sin Framer Motion**: ERP con tablas/formularios no necesita animaciones complejas. View Transitions API de React 19 cubre lo necesario.
- **Sin Magic UI / Aceternity**: Efectos CSS sin valor real para un ERP. Añaden peso y dependencias.
- **Sentry**: `@sentry/nextjs` instalado con DSN en `.env`; dashboard/monitoreo activo aún sin configurar. Pendiente de revisión.
- **Middleware**: `proxy.ts` es detectado automáticamente por Next.js 16 build como middleware. No necesita `middleware.ts`.

## Skills del agente (cargar cuando aplique)

| Skill | Cuándo usarlo |
|-------|--------------|
| `vercel-react-best-practices` | Optimización de componentes, data fetching, bundle |
| `vercel-composition-patterns` | Refactor de componentes con prop drilling, compound components |
| `tailwind-v4-shadcn` | Problemas de CSS, dark mode, theming, shadcn setup |
| `responsive-design` | Layouts responsive, container queries, mobile-first |
| `vercel-react-view-transitions` | Animaciones entre rutas, transiciones de estado |
| `tailwind-design-system` | Sistema de diseño, tokens, componentes reutilizables |
| `web-design-guidelines` | Auditoría de UI/UX, accesibilidad, diseño |

## Entorno local (Fedora 44 + glibc 2.43)

- **Node.js**: Usar v22.x via nvm (`.nvmrc` configurado)
- **SWC**: El binario nativo de SWC es incompatible con glibc 2.43 (SIGBUS). Se usa WASM + Webpack.
- `npm run dev` y `npm run build` ya incluyen `NEXT_TEST_WASM=1 next --webpack`

## Deuda técnica conocida

- [ ] Migrar Float→Decimal en 23 campos financieros
- [ ] Reducir uso de `any` types gradualmente
- [ ] Activar dashboard de Sentry (instalado, DSN presente)
- [ ] Agregar `loading.tsx` para rutas que aún no tienen
- [ ] Implementar perfil de administrador con cambio de contraseña real (Supabase Auth)
