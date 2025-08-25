import { NextRequest, NextResponse } from 'next/server';
import { verifyTokenEdge } from '@/lib/auth';

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  
  console.log('[MIDDLEWARE] Processing:', pathname);

  // Public routes that don't require authentication
  const publicRoutes = [
    '/',
    '/login',
    '/register',
    '/api/auth/login',
    '/api/auth/register',
    '/api/auth/logout',
  ];

  // Check if the current route is public
  const isPublicRoute = publicRoutes.some(route => 
    pathname === route || pathname.startsWith(route + '/')
  );

  // Static assets and API routes (except auth) should be handled separately
  const isStaticAsset = pathname.startsWith('/_next') || 
                       pathname.startsWith('/favicon.ico') ||
                       pathname.startsWith('/images') ||
                       pathname.startsWith('/icons');

  // Allow access to static assets
  if (isStaticAsset) {
    console.log('[MIDDLEWARE] Static asset, allowing:', pathname);
    return NextResponse.next();
  }

  // Allow access to public routes
  if (isPublicRoute) {
    console.log('[MIDDLEWARE] Public route, allowing:', pathname);
    return NextResponse.next();
  }

  console.log('[MIDDLEWARE] Protected route, checking auth:', pathname);

  // For protected routes, check authentication
  const token = getTokenFromRequest(request);
  console.log('[MIDDLEWARE] Token found:', !!token);

  if (!token) {
    // For API routes, return 401 instead of redirect
    if (pathname.startsWith('/api/')) {
      return NextResponse.json(
        { error: 'Token de acesso não encontrado' },
        { status: 401 }
      );
    }
    return redirectToLogin(request);
  }

  // Validate the token
  const payload = await verifyTokenEdge(token);
  console.log('[MIDDLEWARE] Token payload:', payload ? 'valid' : 'invalid');
  if (!payload) {
    console.log('[MIDDLEWARE] Token validation failed, redirecting to login');
    // For API routes, return 401 instead of redirect
    if (pathname.startsWith('/api/')) {
      return NextResponse.json(
        { error: 'Token de acesso inválido' },
        { status: 401 }
      );
    }
    return redirectToLogin(request);
  }

  // Token is valid, allow access to protected route
  // Add user info to headers for use in API routes
  const response = NextResponse.next();
  response.headers.set('x-user-id', payload.userId);
  response.headers.set('x-username', payload.username);

  return response;
}

function getTokenFromRequest(request: NextRequest): string | null {
  // Try to get token from Authorization header first (for API routes)
  const authHeader = request.headers.get('authorization');
  if (authHeader && authHeader.startsWith('Bearer ')) {
    console.log('[MIDDLEWARE] Token found in Authorization header');
    return authHeader.substring(7);
  }

  // Try to get token from cookie (for page routes)
  const tokenFromCookie = request.cookies.get('token')?.value;
  if (tokenFromCookie) {
    console.log('[MIDDLEWARE] Token found in cookie');
    return tokenFromCookie;
  }

  // For now, also check localStorage via a custom header
  // (This is a fallback since middleware can't access localStorage directly)
  const tokenFromHeader = request.headers.get('x-auth-token');
  if (tokenFromHeader) {
    console.log('[MIDDLEWARE] Token found in x-auth-token header');
    return tokenFromHeader;
  }

  console.log('[MIDDLEWARE] No token found in any location');
  console.log('[MIDDLEWARE] Available cookies:', request.cookies.getAll().map(c => c.name));
  return null;
}

function redirectToLogin(request: NextRequest): NextResponse {
  const loginUrl = new URL('/login', request.url);
  
  // Add the intended destination as a query parameter
  if (request.nextUrl.pathname !== '/') {
    loginUrl.searchParams.set('redirect', request.nextUrl.pathname);
  }

  return NextResponse.redirect(loginUrl);
}

// Configure which paths should be processed by this middleware
export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     */
    '/((?!_next/static|_next/image|favicon.ico).*)',
  ],
};