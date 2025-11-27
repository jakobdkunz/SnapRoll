module.exports = function (api) {
  api.cache(true);
  
  // NativeWind v4 works with Metro's withNativeWind wrapper
  // We don't need jsxImportSource or nativewind/babel plugin
  return {
    presets: ['babel-preset-expo'],
    plugins: [
      // react-native-reanimated plugin must be listed last
      'react-native-reanimated/plugin',
    ],
  };
};


