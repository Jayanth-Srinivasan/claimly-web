import { type NextRequest, NextResponse } from 'next/server'
import { updateSession } from '@/lib/supabase/middleware'
import { createServerClient } from '@supabase/ssr'

export async function middleware(request: NextRequest) {
  try {
    const { supabaseResponse, user } = await updateSession(request)

    const path = request.nextUrl.pathname
    const protectedRoutes = ['/dashboard', '/onboarding']
    const adminRoutes = ['/admin']

    const isProtectedRoute = protectedRoutes.some(route => path.startsWith(route))
    const isAdminRoute = adminRoutes.some(route => path.startsWith(route))

    if (!user && isProtectedRoute) {
      return NextResponse.redirect(new URL('/auth', request.url))
    }

    if (user && path === '/auth') {
      const supabase = createServerClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
        {
          cookies: {
            getAll() {
              return request.cookies.getAll()
            },
            setAll(cookiesToSet) {
              cookiesToSet.forEach(({ name, value }) => {
                request.cookies.set(name, value)
              })
            },
          },
        }
      )

      try {
        const { data: profile, error: profileError } = await supabase
          .from('profiles')
          .select('onboarding_completed_at, is_admin')
          .eq('id', user.id)
          .single<{ onboarding_completed_at: string | null; is_admin: boolean }>()

        if (profileError) {
          console.error('Profile fetch error in middleware:', profileError)
          // Default to onboarding if profile fetch fails
          return NextResponse.redirect(new URL('/onboarding', request.url))
        }

        if (!profile?.onboarding_completed_at) {
          return NextResponse.redirect(new URL('/onboarding', request.url))
        }

        if (profile.is_admin) {
          return NextResponse.redirect(new URL('/admin', request.url))
        }

        return NextResponse.redirect(new URL('/dashboard', request.url))
      } catch (dbError) {
        console.error('Database error in middleware:', dbError)
        return NextResponse.redirect(new URL('/onboarding', request.url))
      }
    }

    if (user && isAdminRoute) {
      const supabase = createServerClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
        {
          cookies: {
            getAll() {
              return request.cookies.getAll()
            },
            setAll(cookiesToSet) {
              cookiesToSet.forEach(({ name, value }) => {
                request.cookies.set(name, value)
              })
            },
          },
        }
      )

      try {
        const { data: profile, error: profileError } = await supabase
          .from('profiles')
          .select('is_admin')
          .eq('id', user.id)
          .single<{ is_admin: boolean }>()

        if (profileError) {
          console.error('Admin check error in middleware:', profileError)
          // Deny admin access if profile fetch fails
          return NextResponse.redirect(new URL('/dashboard', request.url))
        }

        if (!profile?.is_admin) {
          return NextResponse.redirect(new URL('/dashboard', request.url))
        }
      } catch (dbError) {
        console.error('Database error checking admin status:', dbError)
        return NextResponse.redirect(new URL('/dashboard', request.url))
      }
    }

    return supabaseResponse
  } catch (error) {
    console.error('Unexpected middleware error:', error)
    // On catastrophic failure, allow request through to avoid complete lockout
    return NextResponse.next()
  }
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
