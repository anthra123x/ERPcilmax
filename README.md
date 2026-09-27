# Tecnicell ERP / ERP Cilmax 🚀

Sistema integral de gestión empresarial, punto de venta (POS), control de inventario en tiempo real, administración de catálogo web y asistente inteligente con IA para comercio minorista y servicios técnicos.

---

## 📌 Estado de Despliegue y Entorno de Ejecución

> **Nota Importante:** Actualmente este proyecto **NO tiene ningún dominio público desplegado en producción**. Se ejecuta y opera de manera **local (On-Premise / Servidor Local de Desarrollo)** en:
> 
> ```
> http://localhost:3000
> ```
>
> La arquitectura está lista para desplegarse en la nube (Vercel, Railway, VPS con Docker/Coolify) cuando se adquiera o configure un dominio de producción.

---

## 🛠️ Stack Tecnológico

| Capa | Tecnología | Detalle |
|------|-----------|---------|
| **Framework** | [Next.js 16](https://nextjs.org/) (App Router) | React 19, compilación Webpack + WASM SWC |
| **Lenguaje** | [TypeScript 5](https://www.typescriptlang.org/) | Modo estricto (`strict: true`) |
| **Base de Datos** | [PostgreSQL (Neon)](https://neon.tech/) | Servidor serverless, pooler `pgcat` con TLS obligatorio |
| **ORM** | [Prisma 5.22](https://www.prisma.io/) | Conexión singleton, migraciones versionadas en `prisma/migrations` |
| **Estilos & UI** | [Tailwind CSS v4](https://tailwindcss.com/) | Estética industrial/brutalista (`--radius: 0px`), shadcn/ui + Base UI v1, Lucide Icons |
| **Autenticación** | [Supabase Auth](https://supabase.com/) | Gestión SSR segura con `@supabase/ssr` y proxy de rutas protegidas |
| **Validación** | [Zod 4](https://zod.dev/) | Esquemas en `@/lib/validations.ts` |
| **Formularios** | [React Hook Form](https://react-hook-form.com/) | Integración con `@hookform/resolvers/zod` |
| **Documentos & PDF** | [@react-pdf/renderer](https://react-pdf.org/) | Facturas POS, recibos térmicos y estados de cuenta en `/print` |
| **Testing** | [Vitest](https://vitest.dev/) | 222 tests unitarios automatizados |
| **Inteligencia Artificial** | Asistente Multi-Agente | Soporte para OpenAI, Anthropic, Google Gemini y contingencia Mock |
| **Monitoreo** | [@sentry/nextjs](https://sentry.io/) | Instrumentación runtime completa en cliente, servidor y edge |

---

## 📦 Módulos Principales

### 1. 🛒 Punto de Venta (POS - `/sales`)
- Carrito de compras reactivo con atajos de teclado para agilidad en caja.
- Múltiples formas de pago: Efectivo, Nequi, Daviplata, Tarjeta débito/crédito, Transferencia bancaria y Crédito directo.
- Validación de precios mínimos (prohibida la venta por debajo del precio de compra).
- Generación de facturas electrónicas/tickets en PDF optimizados para impresión térmica y estándar.

### 2. 📦 Inventario y Almacén (`/inventory`)
- Catálogo de productos con categorías, proveedores, código de barras y referencia interna.
- Cálculo automático de márgenes brutos y utilidades estimadas.
- Monitoreo de stock crítico con umbral configurable por producto (`lowStockThreshold`).
- Registro histórico inmutable de movimientos de stock:
  - `IN` (Entrada por compra o ajuste positivo)
  - `OUT` (Salida por venta o baja)
  - `ADJUSTMENT` (Ajuste de inventario físico)
  - `RESERVATION` (Reserva temporal por pedido web confirmado)
  - `RELEASE` (Liberación por cancelación de pedido web)

### 3. 🌐 Tienda Online y Storefront Headless (`/web` y `/api/web/*`)
- **Panel Administrativo Web**:
  - Control de visibilidad web, destacados en portada y orden de aparición.
  - Galería multimedia con múltiples imágenes por producto (`ProductMedia`).
  - Moderación de reseñas y valoraciones de clientes.
  - Bandeja de entrada de mensajes de contacto.
  - Gestión de pedidos online: flujo `PENDING` ➔ `CONFIRMED` ➔ `CONVERTED` (a venta POS) o `CANCELLED`.
- **API Pública REST (`/api/web/*`)**:
  - Endpoints públicos sin requerimiento de sesión para alimentar cualquier frontend o storefront desacoplado (Astro, Next.js, móviles).
  - Incluye catálogo paginado, categorías, búsqueda, pedidos con código amigable `ORD-XXXX` y rate-limiting por IP.

### 4. 💰 Finanzas y Flujo de Caja (`/finances`)
- Registro de transacciones operativas y no operativas (Ingresos y Gastos).
- Categorización personalizada para análisis financiero.
- Seguimiento de metas financieras de ahorro e inversión con barras de avance porcentual.
- Balance neto mensual consolidado.

### 5. 🤖 Asistente de Negocio con Inteligencia Artificial (`/assistant`)
- Chat conversacional embebido (accesible en pantalla completa y como widget flotante global).
- Inyección de contexto en vivo del negocio (ventas del día, balance del mes, crédito pendiente, stock crítico).
- **Multi-agente con rotación automática**: Conmuta entre proveedores (OpenAI, Anthropic, Google) si un agente reporta límite de cuota o rate limit.
- **Herramientas de consulta segura (Read-Only)**: Permite consultar estadísticas, pedidos y finanzas sin alterar la base de datos.
- **Modo contingencia (Mock)**: Opera con respuestas informadas de la base de datos local incluso sin claves externas configuradas.

### 6. 👥 Clientes y Gestión de Créditos (`/clients`, `/credits`)
- Directorio de clientes con historial de compras.
- Control de créditos, saldo adeudado y registro de abonos parciales.
- Estado de cuenta exportable.

### 7. 📊 Dashboard y Reportes (`/dashboard`, `/reports`)
- Métricas del día: Ventas hoy, dinero recaudado, créditos por cobrar, productos con bajo stock.
- Gráficos comparativos mensuales y distribución por métodos de pago.
- Exportación de reportes a Microsoft Excel (`.xlsx`).

---

## ⌨️ Atajos de Teclado del Sistema

El ERP cuenta con navegación rápida mediante combinaciones de teclas:

| Atajo | Acción |
|-------|--------|
| <kbd>Alt</kbd> + <kbd>Q</kbd> | Búsqueda global / Enfoque rápido |
| <kbd>Alt</kbd> + <kbd>D</kbd> | Ir al Dashboard principal |
| <kbd>Alt</kbd> + <kbd>I</kbd> | Ir a Inventario de productos |
| <kbd>Alt</kbd> + <kbd>V</kbd> | Abrir Punto de Venta (POS) |
| <kbd>Alt</kbd> + <kbd>P</kbd> | Abrir Asistente IA de Negocio |
| <kbd>Alt</kbd> + <kbd>A</kbd> | Panel de Administración (Solo Administrador) |

---

## 🚀 Guía de Inicio Local

### 1. Clonar el repositorio
```bash
git clone https://github.com/anthra123x/ERPcilmax.git
cd ERPcilmax
```

### 2. Instalar dependencias
```bash
npm install
```

### 3. Configurar variables de entorno
Crea el archivo `.env.local` en la raíz del proyecto tomando como base `.env.example`:

```env
# Base de datos PostgreSQL en Neon (Obligatorio sslmode=require)
DATABASE_URL="postgres://usuario:password@endpoint-pooler.neon.tech/neondb?sslmode=require"
DIRECT_URL="postgres://usuario:password@endpoint-pooler.neon.tech/neondb?sslmode=require"

# Autenticación Supabase
NEXT_PUBLIC_SUPABASE_URL="https://tu-proyecto.supabase.co"
NEXT_PUBLIC_SUPABASE_ANON_KEY="tu-anon-key"
SUPABASE_SERVICE_ROLE_KEY="tu-service-role-key"

# Asistente IA (Opcional - array JSON con proveedores y keys)
AI_PROVIDER_KEYS='[{"provider":"openai","key":"sk-...","model":"gpt-4o-mini"}]'
```

### 4. Sincronizar la Base de Datos
Para aplicar las migraciones registradas:
```bash
npm run db:migrate:deploy
```

### 5. Iniciar el servidor local
```bash
npm run dev
```

El servidor estará disponible de inmediato en **`http://localhost:3000`**.

---

## 📜 Scripts Disponibles

| Script | Descripción |
|--------|-------------|
| `npm run dev` | Inicia el servidor de desarrollo en `http://localhost:3000` |
| `npm run build` | Genera el cliente Prisma y compila el bundle de producción |
| `npm run test` | Ejecuta la suite completa de 222 tests unitarios con Vitest |
| `npm run typecheck` | Comprobación estricta de tipos de TypeScript sin emitir código |
| `npm run lint` | Ejecuta ESLint y detector de imports no utilizados |
| `npm run db:push` | Sincroniza el esquema de Prisma directamente a la base de datos |
| `npm run db:migrate` | Crea una nueva migración de Prisma a partir de cambios en `schema.prisma` |
| `npm run db:studio` | Abre Prisma Studio en el navegador para inspeccionar tablas |
| `npm run web:import` | Importador de catálogo web |

---

## 🏛️ Arquitectura del Código

El proyecto sigue una arquitectura **monolítica modular por capas** ubicada en `src/modules/`:

- `*.actions.ts`: **Frontera HTTP / Server Actions**. Valida autenticación (`requireAuth()`), valida esquemas con Zod y delega al servicio. **No ejecuta consultas directas a Prisma.**
- `*.service.ts`: **Capa de Negocio y Persistencia**. Contiene transacciones atómicas (`prisma.$transaction`), consultas SQL y lógica contable/inventario.
- `index.ts`: Punto de exportación público del módulo (barrel).

---

## 🔒 Reglas Críticas de Negocio

1. **`Product.stock` es la única fuente de verdad**: El catálogo web jamás escribe directamente sobre las existencias de inventario.
2. **Costo vs. Precio**: No se permite registrar una venta donde `unitPrice < purchasePrice`.
3. **Reserva de Stock**: Los pedidos web reservan stock únicamente al pasar a estado `CONFIRMED`. Al cancelarse se liberan (`RELEASE`), y al convertirse en venta POS no se descuentan duplicadamente.
4. **Borrado Lógico**: Productos y clientes utilizan `deletedAt` (Soft Delete).
