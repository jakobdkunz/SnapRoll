import * as React from 'react';
import { View, ViewProps } from 'react-native';

export function Card({ style, children, ...rest }: ViewProps) {
  // Default to light mode since Appearance API requires native modules
  const isDark = false;
  return (
    <View
      {...rest}
      style={[
        {
          backgroundColor: isDark ? 'rgba(17,24,39,0.92)' : 'rgba(255,255,255,0.92)',
          borderRadius: 16,
          padding: 12,
          borderColor: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.08)',
          borderWidth: 1
        },
        style
      ]}
    >
      {children}
    </View>
  );
}


