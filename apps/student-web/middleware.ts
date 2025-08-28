import { clerkMiddleware, createRouteMatcher } from '@clerk/nextjs/server';
import { NextResponse } from 'next/server';

const isPublicRoute = createRouteMatcher(["/", "/sign-up(.*)", "/sign-in(.*)", "/sso-callback(.*)"]); 

export default function middleware(req: any, ev: any) {
  if (!process.env.CLERK_SECRET_KEY || !process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY) {
    return NextResponse.next();
  }
  const handler = clerkMiddleware(async (auth, reqInner) => {
    if (isPublicRoute(reqInner)) return;
    const { userId } = await auth();
    if (!userId) {
      const url = new URL('/', reqInner.url);
      return NextResponse.redirect(url);
    }
  });
  return (handler as any)(req as any, ev);
}

export const config = {
  matcher: [
    '/((?!_next|[^?]*\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)',
    '/(api|trpc)(.*)'
  ],
};
