
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

// This is a simplified middleware. For robust auth, consider using NextAuth.js or more detailed Firebase session management.
export function middleware(request: NextRequest) {
  const currentUserCookie = request.cookies.get('firebaseAuthToken'); // Example cookie name, actual implementation depends on how token is stored
  const { pathname } = request.nextUrl;

  const isAuthenticated = !!currentUserCookie; // Basic check

  const authRoutes = ['/login', '/register', '/forgot-password'];
  const protectedAppRoutes = [
    '/admin', 
    '/member', 
    '/profile', 
    '/settings',
    '/bank-admin',   // New protected route
    '/agency-admin'  // New protected route
  ];

  // If trying to access auth page while logged in, redirect to a default page (e.g., dashboard or home)
  if (isAuthenticated && authRoutes.some(route => pathname.startsWith(route))) {
    // Determine redirect based on role if possible, otherwise to a generic authenticated page
    // For now, redirect to home as role isn't easily available in middleware without extra logic
    // A more robust solution would involve decoding the token or having a separate cookie for role
    return NextResponse.redirect(new URL('/', request.url)); 
  }

  // If trying to access protected app page while not logged in, redirect to login
  if (!isAuthenticated && protectedAppRoutes.some(route => pathname.startsWith(route))) {
    return NextResponse.redirect(new URL('/login', request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - api (API routes)
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - images (public images folder)
     * - assets (public assets folder)
     */
    '/((?!api|_next/static|_next/image|favicon.ico|images|assets).*)',
  ],
};
