module.exports = function (api) {
  api.cache(true);
  
  // For NativeWind v4, jsxImportSource in the preset + Metro's withNativeWind
  // should be sufficient. The nativewind/babel plugin causes issues because
  // it returns { plugins: [...] } which Babel can't use directly.
  return {
    presets: [
      ['babel-preset-expo', { jsxImportSource: 'nativewind' }],
    ],
    plugins: [
      // react-native-reanimated plugin must be listed last
      'react-native-reanimated/plugin',
    ],
  };
};


