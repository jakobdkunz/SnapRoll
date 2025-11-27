import * as React from 'react';
import { Slot } from 'expo-router';
import { ClerkProvider, useAuth } from '@clerk/clerk-expo';
import Constants from 'expo-constants';
import { createConvexClient } from '@flamelink/convex-client';
import { ConvexProviderWithClerk } from 'convex/react-clerk';
import { AuthProvider as StudentAuthProvider } from '@flamelink/student-core';

function getEnv() {
  const extra = (Constants?.expoConfig?.extra ?? {}) as { convexUrl?: string; clerkPublishableKey?: string };
  return {
    convexUrl: extra.convexUrl || '',
    clerkPublishableKey: extra.clerkPublishableKey || ''
  };
}

export default function RootLayout() {
  const { convexUrl, clerkPublishableKey } = getEnv();
  const clientRef = React.useRef<ReturnType<typeof createConvexClient> | null>(null);
  if (convexUrl && !clientRef.current) clientRef.current = createConvexClient(convexUrl);

  return (
    <ClerkProvider publishableKey={clerkPublishableKey}>
      {clientRef.current ? (
        <ConvexWithAuth>
          <Slot />
        </ConvexWithAuth>
      ) : (
        <Slot />
      )}
    </ClerkProvider>
  );
}

function ConvexWithAuth({ children }: { children?: React.ReactNode }) {
  const { convexUrl } = getEnv();
  const clientRef = React.useRef<ReturnType<typeof createConvexClient> | null>(null);
  if (convexUrl && !clientRef.current) clientRef.current = createConvexClient(convexUrl);
  const clerk = useAuth();
  if (!clientRef.current) return <>{children}</>;
  return (
    <ConvexProviderWithClerk client={clientRef.current} useAuth={useAuth}>
      <StudentAuthProvider value={{ isLoaded: clerk.isLoaded, isSignedIn: clerk.isSignedIn }}>
        {children}
      </StudentAuthProvider>
    </ConvexProviderWithClerk>
  );
}


