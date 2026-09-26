import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

// Server-side Supabase (for server actions)
export const supabase = createClient(supabaseUrl, supabaseAnonKey)

// Server-side admin Supabase (with service role key)
export const supabaseAdmin = createClient(supabaseUrl, process.env.SUPABASE_SERVICE_ROLE_KEY!, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
})

/**
 * Crea un Supabase server client con acceso a cookies (SSR).
 *
 * Reemplaza el patrón repetido de importar `cookies` + `createServerClient`
 * y configurar `getAll`/`setAll` en cada función de auth. Soporta la API
 * de `@supabase/ssr` usada por el proxy de Next.js 16.
 */
export async function createSupabaseServerAction() {
  const { cookies } = await import('next/headers')
  const { createServerClient } = await import('@supabase/ssr')

  const cookieStore = await cookies()

  return createServerClient(supabaseUrl, supabaseAnonKey, {
    cookies: {
      getAll() {
        return cookieStore.getAll()
      },
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value, options }) => cookieStore.set(name, value, options))
      },
    },
  })
}
