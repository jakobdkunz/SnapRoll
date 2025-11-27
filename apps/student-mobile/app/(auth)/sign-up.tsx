import * as React from 'react';
import { View, Text } from 'react-native';
import { Card } from '@flamelink/ui-native';

export default function SignUpScreen() {
  return (
    <View style={{ padding: 16 }}>
      <Card>
        <Text style={{ fontWeight: '600', marginBottom: 8 }}>Sign Up</Text>
        <Text style={{ color: '#6B7280' }}>
          Sign-up via Clerk is not yet configured in mobile. Please use the web app or configure Clerk providers for Expo.
        </Text>
      </Card>
    </View>
  );
}


