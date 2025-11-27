module.exports = function (api) {
  api.cache(true);
  return {
    presets: [
      ['babel-preset-expo', { jsxImportSource: 'nativewind' }],
      'nativewind/babel',
    ],
    plugins: [
      // react-native-reanimated plugin must be listed last
      require.resolve('react-native-reanimated/plugin'),
    ],
  };
};


