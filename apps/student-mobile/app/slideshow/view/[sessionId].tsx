import * as React from 'react';
import { Text, View } from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import { Card } from '@flamelink/ui-native';

export default function SlideshowView() {
  const { sessionId } = useLocalSearchParams<{ sessionId: string }>();
  return (
    <View style={{ padding: 16 }}>
      <Card>
        <Text style={{ fontWeight: '600', marginBottom: 8 }}>Slideshow</Text>
        <Text>Session: {String(sessionId || '')}</Text>
        <Text style={{ color: '#6B7280', marginTop: 8 }}>Mobile live slides viewer coming soon.</Text>
      </Card>
    </View>
  );
}


