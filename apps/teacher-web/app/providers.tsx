"use client";
import * as React from 'react';
import { AuthKitProvider, useAuth as useWorkOSAuth, useAccessToken } from '@workos-inc/authkit-nextjs/components';
import { ConvexProviderWithAuth, ConvexProvider } from 'convex/react';
import { createConvexClient, getConvexUrl } from '@flamelink/convex-client';

function useAuthFromWorkOS() {
  const { user, loading } = useWorkOSAuth();
  const { accessToken, loading: tokenLoading, getAccessToken } = useAccessToken();

  return React.useMemo(
    () => ({
      isLoading: loading || tokenLoading,
      isAuthenticated: !!user && !!accessToken,
      fetchAccessToken: async () => {
        const token = await getAccessToken();
        return token ?? null;
      },
    }),
    [loading, tokenLoading, user, accessToken, getAccessToken]
  );
}

function AuthDebug() {
  return null;
}

export function Providers({ children }: { children: React.ReactNode }) {
  const clientRef = React.useRef<ReturnType<typeof createConvexClient> | null>(null);
  const url = getConvexUrl();
  if (url && !clientRef.current) clientRef.current = createConvexClient(url);
  const isDemoMode = (process.env.NEXT_PUBLIC_DEMO_MODE ?? "false") === "true";

  // In demo mode, we bypass auth entirely
  if (isDemoMode) {
    const inner = clientRef.current ? (
      <ConvexProvider client={clientRef.current}>{children}</ConvexProvider>
    ) : (
      <>{children}</>
    );
    return inner;
  }

  // Normal mode: use WorkOS + ConvexProviderWithAuth
  return (
    <AuthKitProvider>
      {clientRef.current ? (
        <ConvexProviderWithAuth client={clientRef.current} useAuth={useAuthFromWorkOS}>
          <AuthDebug />
          {children}
        </ConvexProviderWithAuth>
      ) : (
        <>{children}</>
      )}
    </AuthKitProvider>
  );
}
