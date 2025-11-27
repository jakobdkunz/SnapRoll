module.exports = function (api) {
  api.cache(true);
  return {
    presets: ['babel-preset-expo'],
    plugins: [
      'nativewind/babel',
      // react-native-reanimated plugin must be listed last
      require.resolve('react-native-reanimated/plugin'),
    ],
  };
};


