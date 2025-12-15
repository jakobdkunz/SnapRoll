import * as React from 'react';
import { View, Text, ScrollView, ActivityIndicator, Pressable } from 'react-native';
import { Button, Card, TextInput } from '@flamelink/ui-native';
import { useAuth, useSignIn } from '@clerk/clerk-expo';
import { router } from 'expo-router';

export default function SignInScreen() {
  const { isLoaded, isSignedIn } = useAuth();
  const { signIn, setActive, isLoaded: signInLoaded } = useSignIn();
  const [email, setEmail] = React.useState('');
  const [password, setPassword] = React.useState('');
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  React.useEffect(() => {
    if (isLoaded && isSignedIn) {
      router.replace('/sections');
    }
  }, [isLoaded, isSignedIn]);

  const handleSignIn = async () => {
    if (!signInLoaded || !email || !password) return;
    
    try {
      setLoading(true);
      setError(null);
      
      const result = await signIn.create({
        identifier: email,
        password,
      });

      if (result.status === 'complete') {
        await setActive!({ session: result.createdSessionId });
        router.replace('/sections');
      } else {
        setError('Sign in incomplete. Please try again.');
      }
    } catch (err: any) {
      setError(err?.errors?.[0]?.message || 'Sign in failed. Please check your credentials.');
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
                onPress={handleSignIn}
                disabled={loading || !email || !password || !signInLoaded}
                style={({ pressed }) => [
                  { paddingVertical: 12, paddingHorizontal: 16, backgroundColor: '#2563EB', borderRadius: 10, opacity: (loading || !email || !password || !signInLoaded || pressed) ? 0.7 : 1 }
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


