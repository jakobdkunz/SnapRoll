import * as React from 'react';
import { View, Text } from 'react-native';
import { Card } from '@flamelink/ui-native';

export default function MyAttendanceScreen() {
  return (
    <View style={{ padding: 16 }}>
      <Card>
        <Text style={{ fontWeight: '600', marginBottom: 8 }}>My Attendance</Text>
        <Text style={{ color: '#6B7280' }}>Attendance details will appear here.</Text>
      </Card>
    </View>
  );
}


