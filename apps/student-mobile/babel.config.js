module.exports = function (api) {
  api.cache(true);
  
  // nativewind/babel returns { plugins: [...] } which can't be used as a plugin string
  // We need to extract the plugins manually
  const nativewindBabel = require('nativewind/babel');
  const nativewindResult = nativewindBabel(api);
  
  // Carefully extract plugins, ensuring none have .plugins property
  const nativewindPlugins = [];
  for (const plugin of (nativewindResult.plugins || [])) {
    if (!plugin) continue; // Skip null
    
    // Check if this plugin string references worklets (reanimated includes it)
    const pluginStr = typeof plugin === 'string' ? plugin : 
                     (Array.isArray(plugin) && typeof plugin[0] === 'string' ? plugin[0] : '');
    if (pluginStr.includes('react-native-worklets')) continue;
    
    // Ensure the plugin itself doesn't have a .plugins property
    if (typeof plugin === 'object' && plugin !== null && !Array.isArray(plugin)) {
      if ('plugins' in plugin) {
        // This plugin has .plugins property - skip it
        continue;
      }
    }
    
    nativewindPlugins.push(plugin);
  }
  
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


