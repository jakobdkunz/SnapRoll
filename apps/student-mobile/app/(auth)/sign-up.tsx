import * as React from 'react';
import { View, Text, ScrollView, ActivityIndicator, Pressable } from 'react-native';
import { Card } from '@flamelink/ui-native';
import { useAuth, useOAuth } from '@clerk/clerk-expo';
import { router } from 'expo-router';

export default function SignUpScreen() {
  const { isLoaded, isSignedIn } = useAuth();
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  // OAuth strategies
  const { startOAuthFlow: startGoogleOAuth } = useOAuth({ strategy: 'oauth_google' });
  const { startOAuthFlow: startAppleOAuth } = useOAuth({ strategy: 'oauth_apple' });

  React.useEffect(() => {
    if (isLoaded && isSignedIn) {
      router.replace('/sections');
    }
  }, [isLoaded, isSignedIn]);

  const handleOAuth = async (strategy: 'oauth_google' | 'oauth_apple') => {
    try {
      setLoading(true);
      setError(null);
      const startOAuth = strategy === 'oauth_google' ? startGoogleOAuth : startAppleOAuth;
      const { createdSessionId, setActive } = await startOAuth();
      
      if (createdSessionId) {
        await setActive!({ session: createdSessionId });
        router.replace('/sections');
      }
    } catch (err: any) {
      setError(err?.errors?.[0]?.message || 'Authentication failed');
    } finally {
      setLoading(false);
    }
  };

  if (!isLoaded) {
    return (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
        <ActivityIndicator />
      </View>
    );
  }

  return (
    <ScrollView contentContainerStyle={{ padding: 16, gap: 16, flexGrow: 1 }}>
      <View style={{ flex: 1, justifyContent: 'center', maxWidth: 400, width: '100%', alignSelf: 'center' }}>
        <Card>
          <View style={{ gap: 16 }}>
            <View style={{ alignItems: 'center', gap: 8 }}>
              <Text style={{ fontSize: 24, fontWeight: '600' }}>Sign Up</Text>
              <Text style={{ color: '#6B7280', textAlign: 'center' }}>
                Create an account to access your courses and attendance
              </Text>
            </View>

            {error && (
              <View style={{ padding: 12, backgroundColor: '#FEE2E2', borderRadius: 8 }}>
                <Text style={{ color: '#991B1B', textAlign: 'center' }}>{error}</Text>
              </View>
            )}

            <View style={{ gap: 12 }}>
              <Pressable
                onPress={() => !loading && handleOAuth('oauth_google')}
                disabled={loading}
                style={({ pressed }) => [
                  { paddingVertical: 12, paddingHorizontal: 16, backgroundColor: '#4285F4', borderRadius: 10, opacity: loading || pressed ? 0.7 : 1 }
                ]}
              >
                {loading ? (
                  <ActivityIndicator color="white" />
                ) : (
                  <Text style={{ color: 'white', fontWeight: '600', textAlign: 'center' }}>Continue with Google</Text>
                )}
              </Pressable>

              <Pressable
                onPress={() => !loading && handleOAuth('oauth_apple')}
                disabled={loading}
                style={({ pressed }) => [
                  { paddingVertical: 12, paddingHorizontal: 16, backgroundColor: '#000000', borderRadius: 10, opacity: loading || pressed ? 0.7 : 1 }
                ]}
              >
                {loading ? (
                  <ActivityIndicator color="white" />
                ) : (
                  <Text style={{ color: 'white', fontWeight: '600', textAlign: 'center' }}>Continue with Apple</Text>
                )}
              </Pressable>
            </View>

            <View style={{ alignItems: 'center', gap: 8 }}>
              <Text style={{ color: '#6B7280' }}>Already have an account?</Text>
              <Pressable
                onPress={() => router.push('/sign-in')}
                style={({ pressed }) => [
                  { paddingVertical: 10, paddingHorizontal: 20, borderWidth: 1, borderColor: '#2563EB', borderRadius: 10, opacity: pressed ? 0.7 : 1 }
                ]}
              >
                <Text style={{ color: '#2563EB', fontWeight: '600' }}>Sign In</Text>
              </Pressable>
            </View>
          </View>
        </Card>
      </View>
    </ScrollView>
  );
}


