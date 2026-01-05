import { authkitMiddleware } from '@workos-inc/authkit-nextjs';
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

const isPublicRoute = (pathname: string) => {
  const publicRoutes = ["/", "/manifest.json", "/sw.js", "/sign-up", "/sign-in", "/callback", "/login"];
  return publicRoutes.some(route => pathname === route || pathname.startsWith(route + '/') || pathname.startsWith(route + '?'));
};

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

// WorkOS middleware configuration
const workosMiddleware = authkitMiddleware({
  middlewareAuth: {
    enabled: true,
    unauthenticatedPaths: ['/', '/sign-in', '/sign-up', '/callback', '/login', '/manifest.json', '/sw.js'],
  },
});

export default isDemoMode
  ? demoMiddleware
  : async (req: NextRequest) => {
      // For authenticated users on home page, redirect to dashboard
      // This is handled after WorkOS middleware processes the request
      const response = await workosMiddleware(req);
      
      // Check if this is the home page and user should be redirected
      if (req.nextUrl.pathname === '/') {
        // The redirect to dashboard for authenticated users will be handled 
        // in the page component using withAuth
      }
      
      return response;
    };

export const config = {
  matcher: [
    '/((?!_next|[^?]*\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)',
    '/(api|trpc)(.*)'
  ],
};
