"use client";
import * as React from 'react';
import { AuthKitProvider, useAuth as useWorkOSAuth, useAccessToken } from '@workos-inc/authkit-nextjs/components';
import { ConvexProviderWithAuth, ConvexProvider, useMutation } from 'convex/react';
import { createConvexClient, getConvexUrl, api } from '@flamelink/convex-client';
import { DemoUserProvider } from './_components/DemoUserContext';

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
  const { user, loading } = useWorkOSAuth();
  React.useEffect(() => {
    if (process.env.NEXT_PUBLIC_AUTH_DEBUG !== 'true') return;
    if (loading || !user) return;
    // eslint-disable-next-line no-console
    console.log('[auth-debug] WorkOS user:', user.email);
  }, [loading, user]);
  return null;
}

/**
 * Component that ensures demo data exists on first load.
 * This runs once when the app starts in demo mode.
 */
function DemoDataSeeder({ children }: { children: React.ReactNode }) {
  const ensureDemoData = useMutation(api.functions.auth.ensureDemoDataExists);
  const [ready, setReady] = React.useState(false);
  const attemptedRef = React.useRef(false);

  React.useEffect(() => {
    if (attemptedRef.current) return;
    attemptedRef.current = true;

    ensureDemoData()
      .then((result) => {
        if (result.seeded) {
          // eslint-disable-next-line no-console
          console.log('[demo] Seeded demo data');
        }
        setReady(true);
      })
      .catch((err) => {
        // eslint-disable-next-line no-console
        console.error('[demo] Failed to seed demo data:', err);
        // Still show the app even if seeding fails
        setReady(true);
      });
  }, [ensureDemoData]);

  // Show a minimal loading state while seeding
  if (!ready) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-neutral-500 dark:text-neutral-400">Loading demo...</div>
      </div>
    );
  }

  return <>{children}</>;
}

export function Providers({ children }: { children: React.ReactNode }) {
  const clientRef = React.useRef<ReturnType<typeof createConvexClient> | null>(null);
  const url = getConvexUrl();
  if (url && !clientRef.current) clientRef.current = createConvexClient(url);
  const isDemoMode = (process.env.NEXT_PUBLIC_DEMO_MODE ?? "false") === "true";

  // In demo mode, we bypass auth entirely and wrap with DemoUserProvider
  if (isDemoMode) {
    const inner = clientRef.current ? (
      <ConvexProvider client={clientRef.current}>
        <DemoDataSeeder>
          <DemoUserProvider>
            {children}
          </DemoUserProvider>
        </DemoDataSeeder>
      </ConvexProvider>
    ) : (
      <DemoUserProvider>
        {children}
      </DemoUserProvider>
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
