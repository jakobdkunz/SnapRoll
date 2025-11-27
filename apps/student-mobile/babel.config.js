module.exports = function (api) {
  api.cache(true);
  const nativewindBabel = require('nativewind/babel');
  return {
    presets: ['babel-preset-expo'],
    plugins: [
      ...nativewindBabel({}).plugins,
      // react-native-reanimated plugin must be listed last
      require.resolve('react-native-reanimated/plugin'),
    ],
  };
};


