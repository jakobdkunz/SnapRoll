import * as React from 'react';
import { View, Text, ScrollView, ActivityIndicator, Pressable } from 'react-native';
import { Card, TextInput } from '@flamelink/ui-native';
import { useAuth, useSignUp } from '@clerk/clerk-expo';
import { router } from 'expo-router';

export default function SignUpScreen() {
  const { isLoaded, isSignedIn } = useAuth();
  const { signUp, setActive, isLoaded: signUpLoaded } = useSignUp();
  const [email, setEmail] = React.useState('');
  const [password, setPassword] = React.useState('');
  const [firstName, setFirstName] = React.useState('');
  const [lastName, setLastName] = React.useState('');
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [pendingVerification, setPendingVerification] = React.useState(false);
  const [code, setCode] = React.useState('');

  React.useEffect(() => {
    if (isLoaded && isSignedIn) {
      router.replace('/sections');
    }
  }, [isLoaded, isSignedIn]);

  const handleSignUp = async () => {
    if (!signUpLoaded || !email || !password) return;
    
    try {
      setLoading(true);
      setError(null);
      
      const result = await signUp.create({
        emailAddress: email,
        password,
        firstName: firstName || undefined,
        lastName: lastName || undefined,
      });

      // Check if email verification is required
      if (result.status === 'missing_requirements') {
        // Try to prepare email verification
        await signUp.prepareEmailAddressVerification({ strategy: 'email_code' });
        setPendingVerification(true);
      } else if (result.status === 'complete') {
        await setActive!({ session: result.createdSessionId });
        router.replace('/sections');
      } else {
        setError('Sign up incomplete. Please try again.');
      }
    } catch (err: any) {
      setError(err?.errors?.[0]?.message || 'Sign up failed. Please check your information.');
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyEmail = async () => {
    if (!signUpLoaded || !code) return;
    
    try {
      setLoading(true);
      setError(null);
      
      const result = await signUp.attemptEmailAddressVerification({ code });
      
      if (result.status === 'complete') {
        await setActive!({ session: result.createdSessionId });
        router.replace('/sections');
      } else {
        setError('Verification incomplete. Please try again.');
      }
    } catch (err: any) {
      setError(err?.errors?.[0]?.message || 'Verification failed. Please check your code.');
    } finally {
      setLoading(false);
    }
  };

  if (!isLoaded || !signUpLoaded) {
    return (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
        <ActivityIndicator />
      </View>
    );
  }

  if (pendingVerification) {
    return (
      <ScrollView contentContainerStyle={{ padding: 16, gap: 16, flexGrow: 1 }}>
        <View style={{ flex: 1, justifyContent: 'center', maxWidth: 400, width: '100%', alignSelf: 'center' }}>
          <Card>
            <View style={{ gap: 16 }}>
              <View style={{ alignItems: 'center', gap: 8 }}>
                <Text style={{ fontSize: 24, fontWeight: '600' }}>Verify Email</Text>
                <Text style={{ color: '#6B7280', textAlign: 'center' }}>
                  We sent a verification code to {email}. Please enter it below.
                </Text>
              </View>

              {error && (
                <View style={{ padding: 12, backgroundColor: '#FEE2E2', borderRadius: 8 }}>
                  <Text style={{ color: '#991B1B', textAlign: 'center' }}>{error}</Text>
                </View>
              )}

              <View style={{ gap: 12 }}>
                <View style={{ gap: 4 }}>
                  <Text style={{ color: '#374151', fontWeight: '500' }}>Verification Code</Text>
                  <TextInput
                    value={code}
                    onChangeText={setCode}
                    placeholder="Enter verification code"
                    keyboardType="number-pad"
                    autoCapitalize="none"
                  />
                </View>

                <Pressable
                  onPress={handleVerifyEmail}
                  disabled={loading || !code}
                  style={({ pressed }) => [
                    { paddingVertical: 12, paddingHorizontal: 16, backgroundColor: '#2563EB', borderRadius: 10, opacity: (loading || !code || pressed) ? 0.7 : 1 }
                  ]}
                >
                  {loading ? (
                    <ActivityIndicator color="white" />
                  ) : (
                    <Text style={{ color: 'white', fontWeight: '600', textAlign: 'center' }}>Verify</Text>
                  )}
                </Pressable>

                <Pressable
                  onPress={() => setPendingVerification(false)}
                  style={({ pressed }) => [
                    { paddingVertical: 10, paddingHorizontal: 20, opacity: pressed ? 0.7 : 1 }
                  ]}
                >
                  <Text style={{ color: '#2563EB', fontWeight: '600', textAlign: 'center' }}>Back</Text>
                </Pressable>
              </View>
            </View>
          </Card>
        </View>
      </ScrollView>
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
              <View style={{ gap: 4 }}>
                <Text style={{ color: '#374151', fontWeight: '500' }}>First Name (Optional)</Text>
                <TextInput
                  value={firstName}
                  onChangeText={setFirstName}
                  placeholder="Enter your first name"
                  autoCapitalize="words"
                  autoComplete="given-name"
                />
              </View>

              <View style={{ gap: 4 }}>
                <Text style={{ color: '#374151', fontWeight: '500' }}>Last Name (Optional)</Text>
                <TextInput
                  value={lastName}
                  onChangeText={setLastName}
                  placeholder="Enter your last name"
                  autoCapitalize="words"
                  autoComplete="family-name"
                />
              </View>

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
                onPress={handleSignUp}
                disabled={loading || !email || !password}
                style={({ pressed }) => [
                  { paddingVertical: 12, paddingHorizontal: 16, backgroundColor: '#2563EB', borderRadius: 10, opacity: (loading || !email || !password || pressed) ? 0.7 : 1 }
                ]}
              >
                {loading ? (
                  <ActivityIndicator color="white" />
                ) : (
                  <Text style={{ color: 'white', fontWeight: '600', textAlign: 'center' }}>Sign Up</Text>
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


