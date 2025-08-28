"use client";
import * as React from 'react';
import { ClerkProvider, useAuth } from '@clerk/nextjs';
import { ConvexProviderWithClerk } from 'convex/react-clerk';
import { createConvexClient, getConvexUrl } from '@snaproll/convex-client';

export function Providers({ children }: { children: React.ReactNode }) {
  const clientRef = React.useRef<ReturnType<typeof createConvexClient> | null>(null);
  const url = getConvexUrl();
  if (url && !clientRef.current) clientRef.current = createConvexClient(url);
  return (
    <ClerkProvider 
      publishableKey={process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY!}
      signInUrl={process.env.NEXT_PUBLIC_CLERK_SIGN_IN_FORCE_REDIRECT_URL || '/'}
      signUpUrl={process.env.NEXT_PUBLIC_CLERK_SIGN_UP_FORCE_REDIRECT_URL || '/sign-up'}
      afterSignInUrl={process.env.NEXT_PUBLIC_CLERK_SIGN_IN_FALLBACK_REDIRECT_URL || '/'}
      afterSignUpUrl={process.env.NEXT_PUBLIC_CLERK_SIGN_UP_FALLBACK_REDIRECT_URL || '/'}
    >
      {clientRef.current ? (
        <ConvexProviderWithClerk client={clientRef.current} useAuth={useAuth}>
          {children}
        </ConvexProviderWithClerk>
      ) : (
        <>{children}</>
      )}
    </ClerkProvider>
  );
}


