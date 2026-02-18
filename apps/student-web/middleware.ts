import { authkitMiddleware } from '@workos-inc/authkit-nextjs';
import { NextResponse } from 'next/server';
import type { NextRequest, NextFetchEvent } from 'next/server';

// In demo mode, skip WorkOS middleware entirely
const isDemoMode = process.env.NEXT_PUBLIC_DEMO_MODE === "true";

async function demoMiddleware(req: NextRequest) {
  // In demo mode, allow all routes without auth
  // Keep users inside demo (avoid auth pages entirely)
  if (
    req.nextUrl.pathname.startsWith('/sign-in') ||
    req.nextUrl.pathname.startsWith('/sign-up') ||
    req.nextUrl.pathname.startsWith('/callback') ||
    req.nextUrl.pathname.startsWith('/login')
  ) {
    const url = req.nextUrl.clone();
    url.pathname = '/dashboard';
    return NextResponse.redirect(url);
  }
  if (req.nextUrl.pathname === '/') {
    const url = req.nextUrl.clone();
    url.pathname = '/dashboard';
    return NextResponse.redirect(url);
  }
  return NextResponse.next();
}

// WorkOS middleware - export directly for non-demo mode
const workosRedirectUri =
  process.env.WORKOS_REDIRECT_URI ?? process.env.NEXT_PUBLIC_WORKOS_REDIRECT_URI;

const workosMiddleware = authkitMiddleware({
  middlewareAuth: {
    enabled: true,
    unauthenticatedPaths: ['/', '/sign-in', '/sign-up', '/callback', '/login', '/manifest.json', '/sw.js'],
  },
  redirectUri: workosRedirectUri,
});

// Wrapper to catch and expose errors
async function safeWorkosMiddleware(req: NextRequest, event: NextFetchEvent) {
  try {
    // Check env vars before calling WorkOS
    const clientId = process.env.WORKOS_CLIENT_ID;
    const apiKey = process.env.WORKOS_API_KEY;
    const cookiePassword = process.env.WORKOS_COOKIE_PASSWORD;
    const redirectUri = workosRedirectUri;
    
    if (!clientId || !apiKey || !cookiePassword || !redirectUri) {
      console.error('WorkOS env check failed:', {
        hasClientId: !!clientId,
        hasApiKey: !!apiKey,
        hasCookiePassword: !!cookiePassword,
        hasRedirectUri: !!redirectUri,
        cookiePasswordLength: cookiePassword?.length,
      });
      return new NextResponse(
        JSON.stringify({ 
          error: 'WorkOS configuration error',
          missing: {
            WORKOS_CLIENT_ID: !clientId,
            WORKOS_API_KEY: !apiKey,
            WORKOS_COOKIE_PASSWORD: !cookiePassword,
            WORKOS_REDIRECT_URI: !redirectUri,
          },
          cookiePasswordLength: cookiePassword?.length,
          redirectUri: redirectUri || 'NOT SET',
        }),
        { status: 500, headers: { 'Content-Type': 'application/json' } }
      );
    }
    
    if (cookiePassword.length < 32) {
      console.error('WORKOS_COOKIE_PASSWORD must be at least 32 characters, got:', cookiePassword.length);
      return new NextResponse(
        JSON.stringify({ 
          error: 'WORKOS_COOKIE_PASSWORD must be at least 32 characters',
          actualLength: cookiePassword.length,
        }),
        { status: 500, headers: { 'Content-Type': 'application/json' } }
      );
    }
    
    return await workosMiddleware(req, event);
  } catch (error) {
    console.error('WorkOS middleware error:', error);
    return new NextResponse(
      JSON.stringify({ 
        error: 'Middleware error',
        message: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack : undefined,
      }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
}

export default isDemoMode ? demoMiddleware : safeWorkosMiddleware;

export const config = {
  matcher: [
    '/((?!_next|[^?]*\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)',
    '/(api|trpc)(.*)'
  ],
};
