import * as React from 'react';
import { View, Text } from 'react-native';
import { Button, Card } from '@flamelink/ui-native';
import { useAuth } from '@clerk/clerk-expo';

export default function SignInScreen() {
  const { isLoaded, isSignedIn } = useAuth();
  return (
    <View style={{ padding: 16 }}>
      <Card>
        <Text style={{ fontWeight: '600', marginBottom: 8 }}>Sign In</Text>
        <Text style={{ color: '#6B7280', marginBottom: 8 }}>
          {isLoaded ? (isSignedIn ? 'You are signed in.' : 'You are signed out.') : 'Loading auth...'}
        </Text>
        <Text style={{ color: '#6B7280' }}>
          Integrate Clerk Expo OAuth for full sign-in flow. For now, sign in from web or configure providers.
        </Text>
      </Card>
    </View>
  );
}


