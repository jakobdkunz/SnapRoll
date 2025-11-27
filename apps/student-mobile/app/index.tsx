import { useEffect, useState } from 'react';
import { router } from 'expo-router';
import { View, ActivityIndicator } from 'react-native';

export default function Index() {
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    // Ensure component is mounted before navigating
    setIsMounted(true);
  }, []);

  useEffect(() => {
    if (isMounted) {
      // Use setTimeout to ensure navigation happens after layout is ready
      const timer = setTimeout(() => {
        router.replace('/sections');
      }, 0);
      return () => clearTimeout(timer);
    }
  }, [isMounted]);

  return (
    <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
      <ActivityIndicator />
    </View>
  );
}


