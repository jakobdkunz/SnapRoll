import * as React from 'react';
import { View, Text, ScrollView, ActivityIndicator, Pressable } from 'react-native';
import { Button, Card, TextInput } from '@flamelink/ui-native';
import { useAuth, useOAuth } from '@clerk/clerk-expo';
import { router } from 'expo-router';
import * as WebBrowser from 'expo-web-browser';

// Complete the OAuth flow in the browser
WebBrowser.maybeCompleteAuthSession();

export default function SignInScreen() {
  const { isLoaded, isSignedIn } = useAuth();
  const [email, setEmail] = React.useState('');
  const [password, setPassword] = React.useState('');
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
              <Text style={{ fontSize: 24, fontWeight: '600' }}>Sign In</Text>
              <Text style={{ color: '#6B7280', textAlign: 'center' }}>
                Sign in to access your courses and attendance
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

            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
              <View style={{ flex: 1, height: 1, backgroundColor: '#E5E7EB' }} />
              <Text style={{ color: '#6B7280' }}>OR</Text>
              <View style={{ flex: 1, height: 1, backgroundColor: '#E5E7EB' }} />
            </View>

            <View style={{ gap: 12 }}>
              <View style={{ gap: 4 }}>
                <Text style={{ color: '#374151', fontWeight: '500' }}>Email</Text>
                <TextInput
                  value={email}
                  onChangeText={setEmail}
                  placeholder="Enter your email"
                  keyboardType="email-address"
                  autoCapitalize="none"
                  autoComplete="email"
                />
              </View>

              <View style={{ gap: 4 }}>
                <Text style={{ color: '#374151', fontWeight: '500' }}>Password</Text>
                <TextInput
                  value={password}
                  onChangeText={setPassword}
                  placeholder="Enter your password"
                  secureTextEntry
                  autoCapitalize="none"
                  autoComplete="password"
                />
              </View>

              <Pressable
                onPress={async () => {
                  if (loading || !email || !password) return;
                  setError(null);
                  setLoading(true);
                  // Note: Email/password sign-in requires Clerk's signIn method
                  // This is a placeholder - you may need to implement this based on your Clerk setup
                  setError('Email/password sign-in not yet configured. Please use OAuth.');
                  setLoading(false);
                }}
                disabled={loading || !email || !password}
                style={({ pressed }) => [
                  { paddingVertical: 12, paddingHorizontal: 16, backgroundColor: '#2563EB', borderRadius: 10, opacity: (loading || !email || !password || pressed) ? 0.7 : 1 }
                ]}
              >
                {loading ? (
                  <ActivityIndicator color="white" />
                ) : (
                  <Text style={{ color: 'white', fontWeight: '600', textAlign: 'center' }}>Sign In</Text>
                )}
              </Pressable>
            </View>

            <View style={{ alignItems: 'center', gap: 8 }}>
              <Text style={{ color: '#6B7280' }}>Don't have an account?</Text>
              <Pressable
                onPress={() => router.push('/sign-up')}
                style={({ pressed }) => [
                  { paddingVertical: 10, paddingHorizontal: 20, borderWidth: 1, borderColor: '#2563EB', borderRadius: 10, opacity: pressed ? 0.7 : 1 }
                ]}
              >
                <Text style={{ color: '#2563EB', fontWeight: '600' }}>Sign Up</Text>
              </Pressable>
            </View>
          </View>
        </Card>
      </View>
    </ScrollView>
  );
}


