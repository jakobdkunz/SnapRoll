import * as React from 'react';
import { TextInput as RNTextInput, TextInputProps } from 'react-native';

export const TextInput = React.forwardRef<RNTextInput, TextInputProps>(function TextInput(props, ref) {
  const { style, ...rest } = props;
  // Default to light mode since Appearance API requires native modules
  const isDark = false;
  return (
    <RNTextInput
      ref={ref}
      style={[
        {
          paddingVertical: 10,
          paddingHorizontal: 12,
          borderRadius: 10,
          borderColor: isDark ? 'rgba(255,255,255,0.16)' : 'rgba(0,0,0,0.12)',
          borderWidth: 1,
          backgroundColor: isDark ? '#111827' : 'white',
          color: isDark ? 'white' : 'black'
        },
        style
      ]}
      {...rest}
    />
  );
});


