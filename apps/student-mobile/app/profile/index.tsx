import * as React from 'react';
import { View, Text } from 'react-native';
import { Card } from '@flamelink/ui-native';
import { useCurrentUser } from '@flamelink/student-core';

export default function ProfileScreen() {
  const user = useCurrentUser();
  return (
    <View style={{ padding: 16 }}>
      <Card>
        <Text style={{ fontWeight: '600', marginBottom: 8 }}>Profile</Text>
        {user ? (
          <View style={{ gap: 6 }}>
            <Text>Name: {(user.firstName || '') + ' ' + (user.lastName || '')}</Text>
            <Text>Email: {user.email || ''}</Text>
            <Text>Role: {user.role || 'STUDENT'}</Text>
          </View>
        ) : (
          <Text>Loading...</Text>
        )}
      </Card>
    </View>
  );
}


