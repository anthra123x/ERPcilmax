/**
 * Importador de la tienda online desde la BD Neon (storefront legacy) al ERP.
 *
 * Lee catálogo, reseñas, mensajes de contacto, pedidos y ajustes desde la BD
 * Neon de CilMax y los escribe en el ERP (fuente de verdad que reemplaza al
 * panel admin). El producto del ERP es la fuente de stock/precio hacia
 * adelante: la importación NO sobrescribe stock/precio de productos que ya
 * existan en el ERP; solo los siembra cuando se crean y completa los campos
 * web (slug, visibilidad, galería, descripción, orden, destacado).
 *
 * Uso:
 *   NEON_DATABASE_URL=postgresql://... npx tsx prisma/web-import.ts           # dry-run (plan/reporte)
 *   NEON_DATABASE_URL=postgresql://... npx tsx prisma/web-import.ts --apply   # escribe en el ERP
 *
 * El ERP debe tener el schema aplicado (npm run db:push) antes de --apply.
 * Si la BD del ERP no es alcanzable, el dry-run reporta el plan sin verificar
 * existencia (los write se omiten igualmente).
 */

import { Pool } from '@neondatabase/serverless'
import { PrismaClient } from '@prisma/client'

const APPLY = process.argv.includes('--apply')
const prisma = new PrismaClient()

interface NeonCategory { id: string; name: string; slug: string | null }
interface NeonProduct {
  id: string; handle: string | null; title: string; description: string | null;
  images: unknown; tags: string[] | null; featured: boolean | null;
  sort_order: number | null; category_id: string | null
}
interface NeonVariant { product_id: string; price: number; currency: string; inventory_quantity: number | null }
interface NeonReview { id: string; product_id: string; nombre: string; correo: string | null; calificacion: number | null; comentario: string; created_at: unknown }
interface NeonContact { nombre: string; correo: string | null; asunto: string | null; mensaje: string; created_at: unknown }
interface NeonOrderItem { variantId: string; handle?: string | null; title?: string | null; variantTitle?: string | null; price: number; quantity: number }
interface NeonOrder {
  id: string; subtotal_cop: number; notes: string | null; items: NeonOrderItem[];
  created_at: unknown; name: string; phone: string; email: string | null
}
interface NeonTheme { primary_color: string; gold_color: string }

function slugify(value: string): string {
  return value
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 80)
}

function toDate(v: unknown): Date {
  return v instanceof Date ? v : new Date(String(v))
}

function toCopprice(price: number): number {
  return Math.max(0, Math.round(price))
}

type ProdResult<T> = { ok: true; data: T } | { ok: false; message: string }

async function tryErp<T>(fn: () => Promise<T>): Promise<ProdResult<T>> {
  if (!APPLY) return { ok: false, message: 'modo dry-run (no se consulta el ERP)' }
  try {
    return { ok: true, data: await fn() }
  } catch (e) {
    return { ok: false, message: e instanceof Error ? e.message : String(e) }
  }
}

async function main() {
  const neonUrl = process.env.NEON_DATABASE_URL
  if (!neonUrl) {
    console.error('Falta NEON_DATABASE_URL (BD legacy de la tienda).')
    process.exit(1)
  }

  const neon = new Pool({ connectionString: neonUrl })
  console.log(`Modo: ${APPLY ? 'APPLY (escribe en el ERP)' : 'DRY-RUN (solo plan)'}\n`)

  // --- Lectura desde Neon (legacy) -------------------------------------------
  const [catRows, prodRows, revRows, contactRows, themeRows] = await Promise.all([
    neon.query<NeonCategory>(`select id, name, slug from public.categories where store_id = 'cilmax' order by name`),
    neon.query<NeonProduct>(
      `select id, handle, title, coalesce(description,'') as description, images, tags,
              coalesce(featured,false) as featured, coalesce(sort_order,0) as sort_order, category_id
         from public.products where store_id = 'cilmax' order by sort_order asc, title asc`,
    ),
    neon.query<NeonReview>(`select id, product_id, nombre, correo, calificacion, comentario, created_at
                              from public.product_reviews where store_id = 'cilmax' order by created_at asc`),
    neon.query<NeonContact>(`select nombre, correo, asunto, mensaje, created_at
                               from public.contact_messages where store_id = 'cilmax' order by created_at asc`),
    neon.query<NeonTheme>(`select primary_color, gold_color from public.store_settings where store_id = 'cilmax'`),
  ])

  const prodIds = prodRows.rows.map((p) => p.id)
  const variantRows = prodIds.length
    ? await neon.query<NeonVariant>(
        `select product_id, price, currency, inventory_quantity
           from public.product_variants where product_id = any($1::text[])`,
        [prodIds],
      )
    : { rows: [] as NeonVariant[] }

  const orderRows = prodIds.length
    ? await neon.query<NeonOrder>(
        `select o.id, o.subtotal_cop, o.notes, o.items, o.created_at,
                c.name, c.phone, c.email
           from public.orders o join public.customers c on c.id = o.customer_id
          where o.store_id = 'cilmax'
          order by o.created_at asc`,
      )
    : { rows: [] as NeonOrder[] }

  const categories = catRows.rows.map((c) => ({ ...c, slug: c.slug ?? slugify(c.name) }))
  const variantsByProduct = new Map<string, { price: number; currency: string; stock: number }[]>()
  for (const v of variantRows.rows) {
    const list = variantsByProduct.get(v.product_id) ?? []
    list.push({ price: toCopprice(v.price), currency: (v.currency ?? 'cop').toLowerCase(), stock: v.inventory_quantity ?? 0 })
    variantsByProduct.set(v.product_id, list)
  }

  console.log(`Categorías en Neon: ${categories.length}`)
  console.log(`Productos en Neon: ${prodRows.rows.length}`)
  console.log(`Reseñas: ${revRows.rows.length} · Mensajes: ${contactRows.rows.length} · Pedidos: ${orderRows.rows.length}`)
  if (themeRows.rows[0]) console.log(`Tema Neon: ${themeRows.rows[0].primary_color} / ${themeRows.rows[0].gold_color}\n`)

  // --- Categorías -------------------------------------------------------------
  const count = { toCreate: 0, already: 0, linked: 0 }
  const erpCategoryBySlug = new Map<string, string>()

  for (const c of categories) {
    // si el ERP está disponible, verificar si la categoría ya existe por slug o nombre
    const existing = await tryErp(() =>
      prisma.productCategory.findFirst({ where: { OR: [{ slug: c.slug }, { name: c.name }], deletedAt: null } }),
    )
    if (existing.ok && existing.data) {
      count.already++
      erpCategoryBySlug.set(c.slug, existing.data.id)
      const needsSlug = existing.data.slug !== c.slug
      if (needsSlug) {
        console.log(`[cat] ${c.name} (${c.slug}) -> existe; se enlaza su slug`)
        if (APPLY && !existing.data.slug) {
          await prisma.productCategory.update({ where: { id: existing.data.id }, data: { slug: c.slug } })
        }
      } else {
        console.log(`[cat] ${c.name} (${c.slug}) -> ya existe`)
      }
    } else {
      count.toCreate++
      console.log(`[cat] ${c.name} (${c.slug}) ${APPLY ? '-> nuevo' : '-> nuevo (verificado al aplicar)'}`)
      if (APPLY) {
        const created = await prisma.productCategory.create({ data: { name: c.name, slug: c.slug, color: null } })
        erpCategoryBySlug.set(c.slug, created.id)
      }
    }
  }
  console.log('')

  // --- Productos --------------------------------------------------------------
  const prodCount = { toCreate: 0, existing: 0, renamed: 0 }
  const erpIdByNeonProductId = new Map<string, string>()

  for (const p of prodRows.rows) {
    const handle = p.handle ?? slugify(p.title)
    const variants = variantsByProduct.get(p.id) ?? []
    const totalStock = variants.reduce((acc, v) => acc + v.stock, 0)
    const salePrice = variants[0]?.price ?? 0
    const images: string[] = Array.isArray(p.images) ? (p.images.filter(Boolean) as string[]) : []
    const featured = Boolean(p.featured)
    const neonCategory = p.category_id ? categories.find((c) => c.id === p.category_id) : null
    const erpCategoryId = neonCategory ? erpCategoryBySlug.get(neonCategory.slug) ?? null : null

    const existing = await tryErp(() =>
      prisma.product.findFirst({
        where: { OR: [{ slug: handle }, { slug: slugify(p.title) }], deletedAt: { equals: null } },
        select: { id: true, slug: true, salePrice: true, stock: true, categoryId: true },
      }),
    )
    const matches = existing.ok && existing.data ? existing.data.slug === handle : undefined

    if (existing.ok && existing.data) {
      prodCount.existing++
      const info = matches
        ? `precio ERP=${existing.data.salePrice} (Neon=${salePrice}) | stock ERP=${existing.data.stock} (Neon=${totalStock}) | imgs=${images.length}`
        : `\n     ${ONLY_BY_SLUG_MSG} (slug=${existing.data.slug})`
      console.log(`[prod] ${handle} -> EXISTE | ${info}`)
      if (APPLY && matches) {
        await prisma.product.update({
          where: { id: existing.data.id },
          data: {
            slug: handle,
            webVisible: true,
            webFeatured: featured,
            webSortOrder: p.sort_order ?? 0,
            webDescription: p.description ?? null,
            categoryId: erpCategoryId ?? existing.data.categoryId,
          },
        })
        await syncMedia(prisma, existing.data.id, images)
      }
    } else {
      prodCount.toCreate++
      console.log(`[prod] ${handle} -> ${APPLY ? 'NUEVO' : 'nuevo'}` +
        ` | precio=${salePrice} | stock=${totalStock} | imgs=${images.length} | cat=${erpCategoryId ?? '-'}`)
      if (APPLY) {
        const created = await prisma.product.create({
          data: {
            name: p.title,
            description: p.description ?? null,
            salePrice,
            costPrice: 0,
            stock: totalStock,
            categoryId: erpCategoryId,
            slug: handle,
            webVisible: true,
            webFeatured: featured,
            webSortOrder: p.sort_order ?? 0,
            webDescription: p.description ?? null,
            imageUrl: images[0] ?? null,
          },
        })
        erpIdByNeonProductId.set(p.id, created.id)
        await syncMedia(prisma, created.id, images)
      }
    }
  }
  console.log('')

  // --- Reseñas ----------------------------------------------------------------
  async function erpProductIdFor(p: NeonProduct): Promise<string | null> {
    const cached = erpIdByNeonProductId.get(p.id)
    if (cached) return cached
    const handle = p.handle ?? slugify(p.title)
    const found = await tryErp(() =>
      prisma.product.findFirst({
        where: { OR: [{ slug: handle }, { name: p.title }], deletedAt: null },
        select: { id: true },
      }),
    )
    return found.ok ? (found.data?.id ?? null) : null
  }

  const revCount = { toCreate: 0, skipped: 0 }
  for (const r of revRows.rows) {
    const neonProduct = prodRows.rows.find((p) => p.id === r.product_id)
    const erpId = neonProduct ? await erpProductIdFor(neonProduct) : null
    if (!erpId) {
      revCount.skipped++
      console.warn(`[rev] ${r.id} -> sin producto en el ERP, se omite`)
      continue
    }
    revCount.toCreate++
    console.log(`[rev] ${r.nombre}: ${r.calificacion}★ (producto ${erpId}) ${APPLY ? '' : '(plan)'}`)
    if (APPLY) {
      await prisma.productReview.create({
        data: {
          productId: erpId,
          name: r.nombre,
          email: r.correo,
          rating: Math.min(5, Math.max(1, r.calificacion ?? 5)),
          comment: r.comentario,
          approved: true,
          createdAt: toDate(r.created_at),
        },
      })
    }
  }
  console.log('')

  // --- Mensajes de contacto ---------------------------------------------------
  const msgCount = { toCreate: 0 }
  for (const m of contactRows.rows) {
    msgCount.toCreate++
    const asunto = m.asunto && m.asunto !== 'Consulta desde la web'
    const message = asunto ? `${m.asunto} — ${m.mensaje}` : m.mensaje
    console.log(`[msg] ${m.nombre} (${m.correo ?? 'sin correo'}) ${APPLY ? '' : '(plan)'}`)
    if (APPLY) {
      await prisma.contactMessage.create({
        data: { name: m.nombre, email: m.correo, phone: null, message, createdAt: toDate(m.created_at) },
      })
    }
  }
  console.log('')

  // --- Pedidos web ------------------------------------------------------------
  const ordCount = { toCreate: 0, items: 0, skipped: 0 }
  for (const o of orderRows.rows) {
    const items = Array.isArray(o.items) ? (o.items as NeonOrderItem[]) : []
    const mapped: { productId: string | null; productName: string; handle: string | null; unitPrice: number; quantity: number }[] = []
    for (const it of items) {
      const product = prodRows.rows.find((p) => p.handle === it.handle)
        ?? prodRows.rows.find((p) => p.title === it.title)
      const erpId = product ? await erpProductIdFor(product) : null
      mapped.push({
        productId: erpId,
        productName: it.title ?? it.variantTitle ?? slugify(it.handle ?? 'sin-nombre'),
        handle: it.handle ?? null,
        unitPrice: Math.round(it.price ?? 0),
        quantity: it.quantity ?? 1,
      })
    }
    if (mapped.length === 0) {
      ordCount.skipped++
      console.warn(`[ord] ${o.id} -> sin líneas, se omite`)
      continue
    }
    ordCount.toCreate++
    ordCount.items += mapped.length
    console.log(`[ord] ${o.name} (${o.phone}) ${mapped.length} líneas | total=${o.subtotal_cop} ${APPLY ? '' : '(plan)'}`)
    if (APPLY) {
      await prisma.webOrder.create({
        data: {
          customerName: o.name,
          customerPhone: o.phone,
          customerEmail: o.email,
          notes: o.notes,
          total: o.subtotal_cop ?? 0,
          currency: 'COP',
          status: 'PENDING',
          createdAt: toDate(o.created_at),
          items: {
            create: mapped.map((it) => ({
              productId: it.productId,
              productName: it.productName,
              handle: it.handle,
              unitPrice: it.unitPrice,
              quantity: it.quantity,
              total: it.unitPrice * it.quantity,
            })),
          },
        },
      })
    }
  }

  // --- Tema -------------------------------------------------------------------
  if (themeRows.rows[0]) {
    const theme = themeRows.rows[0]
    console.log(`[theme] { primaryColor: ${theme.primary_color}, goldColor: ${theme.gold_color} } ${APPLY ? '' : '(plan)'}`)
    if (APPLY) {
      await prisma.storeSetting.upsert({
        where: { key: 'theme' },
        create: { key: 'theme', value: { primaryColor: theme.primary_color, goldColor: theme.gold_color } },
        update: { value: { primaryColor: theme.primary_color, goldColor: theme.gold_color } },
      })
    }
  }

  // --- Resumen ---------------------------------------------------------------
  console.log('\n===== RESUMEN =====')
  console.log(`Categorías   : ${count.toCreate} nuevas · ${count.already} existentes/enlazadas`)
  console.log(`Productos    : ${prodCount.toCreate} nuevos · ${prodCount.existing} existentes (${prodCount.renamed} con slug distinto, sin tocar)`)
  console.log(`Reseñas      : ${revCount.toCreate} · ${revCount.skipped} omitidas (sin producto en el ERP)`)
  console.log(`Mensajes     : ${msgCount.toCreate}`)
  console.log(`Pedidos      : ${ordCount.toCreate} (${ordCount.items} líneas) · ${ordCount.skipped} omitidos`)
  console.log(`Tema         : ${themeRows.rows[0] ? 'a aplicar' : 'no detectado'}`)
  console.log(APPLY ? '\nImportación finalizada en el ERP.' : '\nDRY-RUN: no se escribió nada. Usa --apply cuando el ERP tenga el schema aplicado.')
}

async function syncMedia(prisma: PrismaClient, productId: string, urls: string[]) {
  await prisma.productMedia.deleteMany({ where: { productId } })
  if (urls.length === 0) return
  await prisma.productMedia.createMany({ data: urls.map((url, i) => ({ productId, url, position: i })) })
}

const ONLY_BY_SLUG_MSG = 'existe en el ERP por nombre pero con slug distinto: no se toca para evitar duplicados.'

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })