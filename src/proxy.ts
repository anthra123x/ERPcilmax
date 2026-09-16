import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

export async function proxy(req: NextRequest) {
  const { pathname } = req.nextUrl

  const protectedRoutes = ['/dashboard', '/inventory', '/repairs', '/admin', '/reports', '/web']
  const isProtectedRoute = protectedRoutes.some((route) => pathname.startsWith(route))
  const isAuthRoute = pathname === '/login'

  // Quick check: look for any sb-* auth cookie in the request
  const authCookies = req.cookies.getAll().filter((c) => c.name.startsWith('sb-'))
  const hasSessionCookie = authCookies.some((c) => c.value.length > 0)

  if (isProtectedRoute && !hasSessionCookie) {
    const redirectUrl = new URL('/login', req.url)
    redirectUrl.searchParams.set('redirectTo', pathname)
    return NextResponse.redirect(redirectUrl)
  }

  if (isAuthRoute && hasSessionCookie) {
    return NextResponse.redirect(new URL('/dashboard', req.url))
  }

  // For protected routes with session cookie on GET navigations, create server
  // client to refresh cookies and pass updated values to both browser and server
  // components. Server Actions and API writes authenticate on their own, so we
  // skip this to avoid an extra Supabase roundtrip on every POST.
  if (isProtectedRoute && hasSessionCookie && req.method === 'GET') {
    const res = NextResponse.next({ request: req })

    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll() {
            return req.cookies.getAll()
          },
          setAll(cookiesToSet, headers) {
            cookiesToSet.forEach(({ name, value }) => {
              req.cookies.set(name, value)
              res.cookies.set(name, value)
            })
            for (const [key, value] of Object.entries(headers)) {
              res.headers.set(key, value)
            }
          },
        },
      },
    )

    await supabase.auth.getClaims().catch(() => {})

    return res
  }

  return NextResponse.next({ request: req })
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public folder
     */
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}
