module.exports = function (api) {
  api.cache(true);
  const nativewindBabel = require('nativewind/babel');
  const nativewindResult = nativewindBabel(api);
  const reanimatedPlugin = require.resolve('react-native-reanimated/plugin');
  
  // Filter out null and worklets plugin (react-native-reanimated already includes it)
  const nativewindPlugins = (nativewindResult.plugins || [])
    .filter(Boolean)
    .filter(plugin => {
      const pluginPath = typeof plugin === 'string' ? plugin : 
                        (plugin && plugin[0] ? plugin[0] : '');
      return !pluginPath.includes('react-native-worklets');
    });
  
  // Deduplicate plugins by resolving paths
  const seenPlugins = new Set();
  const uniquePlugins = [];
  
  for (const plugin of nativewindPlugins) {
    let pluginId;
    if (typeof plugin === 'string') {
      try {
        pluginId = require.resolve(plugin);
      } catch {
        pluginId = plugin;
      }
    } else if (Array.isArray(plugin) && typeof plugin[0] === 'string') {
      try {
        pluginId = require.resolve(plugin[0]);
      } catch {
        pluginId = plugin[0];
      }
    } else {
      pluginId = String(plugin);
    }
    
    if (!seenPlugins.has(pluginId)) {
      seenPlugins.add(pluginId);
      uniquePlugins.push(plugin);
    }
  }
  
  return {
    presets: [
      ['babel-preset-expo', { jsxImportSource: 'nativewind' }],
    ],
    plugins: [
      ...uniquePlugins,
      // react-native-reanimated plugin must be listed last
      reanimatedPlugin,
    ],
  };
};


