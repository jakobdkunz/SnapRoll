import * as React from 'react';
import { StyleSheet, TextInput as RNTextInput, TextInputProps } from 'react-native';

const baseStyle = StyleSheet.create({
  input: {
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 10,
    borderWidth: 1
  }
});

export const TextInput = React.forwardRef<RNTextInput, TextInputProps>(function TextInput(props, ref) {
  const { style, ...rest } = props;
  // Default to light mode since Appearance API requires native modules
  const isDark = false;
  const themedStyle = {
    borderColor: isDark ? 'rgba(255,255,255,0.16)' : 'rgba(0,0,0,0.12)',
    backgroundColor: isDark ? '#111827' : 'white',
    color: isDark ? 'white' : 'black'
  };

  return (
    <RNTextInput
      ref={ref}
      style={StyleSheet.compose(StyleSheet.compose(baseStyle.input, themedStyle), style)}
      placeholderTextColor={isDark ? 'rgba(255,255,255,0.6)' : '#9CA3AF'}
      {...rest}
    />
  );
});


