# Guía de Neon (base de datos)

> La base de datos es **Neon (PostgreSQL)**. Nada de base de datos alojada en Supabase:
> Supabase solo se usa como proveedor de **identidad** (login), que es una pieza distinta.

## Topología de conexiones

Neon ofrece dos endpoints y se usan para cosas distintas:

| Variable       | Endpoint               | Para qué                            | Puerto |
| -------------- | ---------------------- | ----------------------------------- | ------ |
| `DATABASE_URL` | `-pooler.` (pooled)    | Queries del app en runtime          | 5432   |
| `DIRECT_URL`   | sin `-pooler` (direct) | Migraciones, `db push`, `db studio` | 5432   |

Ambos apuntan a la **misma** base de datos. `DIRECT_URL` existe porque las migraciones
no pueden pasar por el pooler.

```bash
DATABASE_URL="postgresql://USER:PASS@ep-XXX-pooler.REGION.aws.neon.tech/neondb?sslmode=require"
DIRECT_URL="postgresql://USER:PASS@ep-XXX.REGION.aws.neon.tech/neondb?sslmode=require"
```

### Reglas de la URL

- **`sslmode=require` es obligatorio.** Neon rechaza conexiones sin TLS.
- **NO agregues `pgbouncer=true`.** El pooler de Neon es `pgcat`, no PgBouncer, y sí
  soporta _prepared statements_. Esa bandera existe para PgBouncer y aquí rompe las queries.
- **NO uses `?schema=erp`.** La app trabaja en el schema `public` (ver más abajo).
- En Vercel (serverless) el pooler es obligatorio: cada instancia abre su propio pool
  contra la DB y sin pooler se agotan las conexiones.

## Puesta en marcha en una DB nueva de Neon

```bash
# 1. Pon las credenciales nuevas en .env.local (DATABASE_URL y DIRECT_URL)
# 2. Aplica el historial de migraciones (crea el schema completo)
npm run db:migrate:deploy

# 3. Verifica
npm run db:status

# 4. Carga los datos base
npm run db:seed
```

`db:migrate:deploy` es **no destructivo**: solo aplica migraciones pendientes.
Nunca corre migraciones automáticamente en el build de Vercel (`vercel.json` usa
`prisma generate && next build` a propósito): dos deploys simultáneos pelearían
por el lock de migraciones. Las migraciones se despliegan como paso explícito.

## Historia de migraciones

El historial empieza con dos migraciones:

| Migración                                | Qué hace                                            |
| ---------------------------------------- | --------------------------------------------------- |
| `20260101000000_init`                    | Crea las 25 tablas, 6 enums y 68 índices desde cero |
| `20260101000100_add_transaction_indexes` | Índices compuestos de `transactions`                |

La segunda existe por un motivo concreto: esos dos índices ya estaban declarados en
`schema.prisma` pero **nunca se habían aplicado en la base de datos**, porque hasta
ahora el schema se sincronizaba con `db push` y no había historial. Es la razón
principal para no volver a `db push` en una base compartida.

### Reglas

- `npm run db:migrate` (=`migrate dev`) → **solo** contra una base local desechable.
  Detecta drift y puede ofrecer **resetear la base**.
- `npm run db:migrate:deploy` → staging, producción y bases nuevas.
- Si el schema de `schema.prisma` y la base real divergen, no uses `db push` para
  "arreglarlo": genera la diferencia y revísala antes de aplicarla.
- **Nunca edites una migración ya aplicada.** Prisma valida checksums y un archivo
  editado provoca `P3006 checksum mismatch` en todos los demás entornos.

## El schema `erp` (datos reales preexistentes)

La base actual tiene **dos schemas**:

| Schema   | Contenido                                                           |
| -------- | ------------------------------------------------------------------- |
| `erp`    | Los datos reales del negocio (productos, usuarios, ventas, ajustes) |
| `public` | Tablas vacías creadas por `db push`                                 |

`schema.prisma` no declara ningún `@@schema("erp")`, así que **Prisma opera sobre
`public`**. Por eso el app veía una base vacía y devolvía los valores por defecto
de `DEFAULT_WEB_SETTINGS` en vez de los datos guardados.

Los datos de `erp` están respaldados en `backups/` (ignorado por git). Al migrar a la
DB nueva hay que importarlos a `public`, que es donde el app va a buscarlos.

## Respaldo

```bash
# Dump de un schema concreto
pg_dump "$CONN" -n public -f backups/public_$(date +%Y%m%d_%H%M%S).sql
```

`backups/` está en `.gitignore`: contiene datos reales, nunca deben subirse al repo.
