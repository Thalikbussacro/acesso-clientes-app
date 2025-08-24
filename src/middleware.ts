import { NextRequest, NextResponse } from 'next/server';
import { verifyToken } from '@/lib/auth';

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Public routes that don't require authentication
  const publicRoutes = [
    '/',
    '/login',
    '/api/auth/login',
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
    return NextResponse.next();
  }

  // Allow access to public routes
  if (isPublicRoute) {
    return NextResponse.next();
  }

  // For protected routes, check authentication
  const token = getTokenFromRequest(request);

  if (!token) {
    return redirectToLogin(request);
  }

  // Validate the token
  const payload = verifyToken(token);
  if (!payload) {
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
    return authHeader.substring(7);
  }

  // Try to get token from cookie (for page routes)
  const tokenFromCookie = request.cookies.get('token')?.value;
  if (tokenFromCookie) {
    return tokenFromCookie;
  }

  // For now, also check localStorage via a custom header
  // (This is a fallback since middleware can't access localStorage directly)
  const tokenFromHeader = request.headers.get('x-auth-token');
  if (tokenFromHeader) {
    return tokenFromHeader;
  }

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
     * - api (API routes)
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     */
    '/((?!api|_next/static|_next/image|favicon.ico).*)',
  ],
};