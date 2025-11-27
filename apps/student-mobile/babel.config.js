module.exports = function (api) {
  api.cache(true);
  const nativewindBabel = require('nativewind/babel');
  const nativewindResult = nativewindBabel(api);
  
  return {
    presets: [
      ['babel-preset-expo', { jsxImportSource: 'nativewind' }],
    ],
    plugins: [
      ...(nativewindResult.plugins || []).filter(Boolean),
      // react-native-reanimated plugin must be listed last
      require.resolve('react-native-reanimated/plugin'),
    ],
  };
};


