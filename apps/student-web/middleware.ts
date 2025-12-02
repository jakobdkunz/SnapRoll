import { clerkMiddleware, createRouteMatcher } from '@clerk/nextjs/server';
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

const isPublicRoute = createRouteMatcher(["/", "/manifest.json", "/sw.js", "/sign-up(.*)", "/sign-in(.*)", "/sso-callback(.*)"]); 

// In demo mode, skip Clerk middleware entirely
const isDemoMode = process.env.NEXT_PUBLIC_DEMO_MODE === "true";

export default isDemoMode
  ? async (req: NextRequest) => {
      // In demo mode, allow all routes without auth
      if (req.nextUrl.pathname === '/') {
        const url = req.nextUrl.clone();
        url.pathname = '/sections';
        return NextResponse.redirect(url);
      }
      return NextResponse.next();
    }
  : clerkMiddleware(async (auth, req) => {
      const { userId, redirectToSignIn } = await auth();

      if (req.nextUrl.pathname === '/') {
        if (userId) {
          const url = req.nextUrl.clone();
          url.pathname = '/sections';
          return NextResponse.redirect(url);
        }
        return;
      }

      if (isPublicRoute(req)) return;
      if (!userId) return redirectToSignIn({ returnBackUrl: req.url });
    });

export const config = {
  matcher: [
    '/((?!_next|[^?]*\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)',
    '/(api|trpc)(.*)'
  ],
};
