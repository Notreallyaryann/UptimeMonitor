import NextAuth from "next-auth"
import authConfig from "./auth.config"

const { auth } = NextAuth(authConfig)

export default auth((req) => {
    const isLoggedIn = !!req.auth
    const { nextUrl } = req

    const isApiAuthRoute = nextUrl.pathname.startsWith('/api/auth')
    const isAuthRoute = ['/login', '/register'].includes(nextUrl.pathname)
    const isPublicRoute = ['/'].includes(nextUrl.pathname)

    if (isApiAuthRoute) return null

    if (isAuthRoute) {
        if (isLoggedIn) {
            return Response.redirect(new URL('/dashboard', nextUrl))
        }
        return null
    }

    if (!isLoggedIn && !isPublicRoute) {
        return Response.redirect(new URL('/login', nextUrl))
    }

    return null
})

export const config = {
    matcher: ['/((?!api|_next/static|_next/image|favicon.ico).*)'],
}
