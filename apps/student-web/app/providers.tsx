"use client";
import * as React from 'react';
import { ClerkProvider, useAuth } from '@clerk/nextjs';
import { ConvexProviderWithClerk } from 'convex/react-clerk';
import { createConvexClient, getConvexUrl } from '@snaproll/convex-client';

function AuthDebug() {
  const { isLoaded, isSignedIn, getToken } = useAuth();
  React.useEffect(() => {
    if (process.env.NEXT_PUBLIC_AUTH_DEBUG !== 'true') return;
    if (!isLoaded || !isSignedIn) return;
    (async () => {
      try {
        const token = await getToken({ template: 'convex' });
        if (!token) {
          if (process.env.NEXT_PUBLIC_AUTH_DEBUG === 'true') {
            // eslint-disable-next-line no-console
            console.log('[auth-debug] No Convex token from Clerk.');
          }
          return;
        }
        const payloadPart = token.split('.')[1] || '';
        const payload = (payloadPart ? JSON.parse(atob(payloadPart)) : {}) as { aud?: string; iss?: string };
        if (process.env.NEXT_PUBLIC_AUTH_DEBUG === 'true') {
          // eslint-disable-next-line no-console
          console.log('[auth-debug] Convex JWT aud:', payload.aud, 'iss:', payload.iss);
        }
      } catch (e) {
        if (process.env.NEXT_PUBLIC_AUTH_DEBUG === 'true') {
          // eslint-disable-next-line no-console
          console.log('[auth-debug] Error fetching Convex token', e);
        }
      }
    })();
  }, [isLoaded, isSignedIn, getToken]);
  return null;
}

export function Providers({ children }: { children: React.ReactNode }) {
  const clientRef = React.useRef<ReturnType<typeof createConvexClient> | null>(null);
  const url = getConvexUrl();
  if (url && !clientRef.current) clientRef.current = createConvexClient(url);
  return (
    <ClerkProvider 
      publishableKey={process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY!}
      signInUrl={process.env.NEXT_PUBLIC_CLERK_SIGN_IN_URL || '/sign-in'}
      signUpUrl={process.env.NEXT_PUBLIC_CLERK_SIGN_UP_URL || '/sign-up'}
    >
      {clientRef.current ? (
        <ConvexProviderWithClerk client={clientRef.current} useAuth={useAuth}>
          <AuthDebug />
          {children}
        </ConvexProviderWithClerk>
      ) : (
        <>{children}</>
      )}
    </ClerkProvider>
  );
}


