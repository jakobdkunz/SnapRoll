import { clerkMiddleware, createRouteMatcher } from '@clerk/nextjs/server';
import { NextResponse } from 'next/server';

const isPublicRoute = createRouteMatcher(["/", "/manifest.json", "/sw.js", "/sign-up(.*)", "/sign-in(.*)", "/sso-callback(.*)"]); 

export default clerkMiddleware(async (auth, req) => {
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
