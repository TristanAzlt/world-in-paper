import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export function middleware(request: NextRequest) {
  // Check for auth session cookie
  const hasSession =
    request.cookies.has('authjs.session-token') ||
    request.cookies.has('__Secure-authjs.session-token');

  const path = request.nextUrl.pathname;

  // Public routes — no auth needed
  if (path === '/' || path.startsWith('/api')) {
    return NextResponse.next();
  }

  // Protected routes — redirect to login if no session
  if (!hasSession) {
    return NextResponse.redirect(new URL('/', request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|.*\\.png|.*\\.svg|.*\\.ico).*)'],
};
