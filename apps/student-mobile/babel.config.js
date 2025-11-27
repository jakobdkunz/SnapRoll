module.exports = function (api) {
  api.cache(true);
  
  // Manually require and extract plugins from nativewind/babel
  // This avoids the issue where Babel tries to use the result object as a plugin
  const nativewindBabel = require('nativewind/babel');
  const nativewindConfig = nativewindBabel(api);
  
  // Extract only the plugins array, filter out nulls and worklets (reanimated includes it)
  const nativewindPlugins = (nativewindConfig.plugins || [])
    .filter(Boolean)
    .filter(plugin => {
      const pluginStr = typeof plugin === 'string' ? plugin : 
                       (Array.isArray(plugin) && typeof plugin[0] === 'string' ? plugin[0] : '');
      return !pluginStr.includes('react-native-worklets');
    });
  
  return {
    presets: [
      ['babel-preset-expo', { jsxImportSource: 'nativewind' }],
    ],
    plugins: [
      ...nativewindPlugins,
      // react-native-reanimated plugin must be listed last
      'react-native-reanimated/plugin',
    ],
  };
};


