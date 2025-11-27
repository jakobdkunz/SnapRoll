import * as React from 'react';
import { TextInput as RNTextInput, TextInputProps, TextStyle, ViewStyle } from 'react-native';

export const TextInput = React.forwardRef<RNTextInput, TextInputProps>(function TextInput(props, ref) {
  const { style, ...rest } = props;
  // Default to light mode since Appearance API requires native modules
  const isDark = false;
  
  // Create base styles as plain objects to avoid mutation issues
  const baseStyle: TextStyle = {
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: isDark ? 'rgba(255,255,255,0.16)' : 'rgba(0,0,0,0.12)',
    backgroundColor: isDark ? '#111827' : 'white',
    color: isDark ? 'white' : 'black'
  };

  return (
    <RNTextInput
      ref={ref}
      style={[baseStyle, style]}
      placeholderTextColor={isDark ? 'rgba(255,255,255,0.6)' : '#9CA3AF'}
      {...rest}
    />
  );
});


