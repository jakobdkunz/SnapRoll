import { clerkMiddleware } from '@clerk/nextjs/server';
import { NextResponse } from 'next/server';

const handler = clerkMiddleware();

export default function middleware(req: Request) {
  if (!process.env.CLERK_SECRET_KEY || !process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY) {
    return NextResponse.next();
  }
  // @ts-ignore: Clerk middleware expects NextRequest
  return handler(req);
}

export const config = {
  matcher: [
    '/((?!_next|[^?]*\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)',
    '/(api|trpc)(.*)'
  ],
};
