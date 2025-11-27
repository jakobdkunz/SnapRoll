const { getDefaultConfig } = require('@expo/metro-config');
const { withNativeWind } = require('nativewind/metro');
const path = require('path');

const projectRoot = __dirname;
const workspaceRoot = path.resolve(projectRoot, '../..');

const config = getDefaultConfig(projectRoot);

// Explicitly set project root - this is critical for monorepo
config.projectRoot = projectRoot;
config.watchFolders = [workspaceRoot];

// Ensure resolver can find dependencies in both project and workspace node_modules
config.resolver = {
  ...config.resolver,
  // Don't disable hierarchical lookup - we need it for monorepo
  nodeModulesPaths: [
    path.resolve(projectRoot, 'node_modules'),
    path.resolve(workspaceRoot, 'node_modules'),
  ],
};

// Transpile monorepo packages
config.transformer.unstable_allowRequireContext = true;
config.resolver.sourceExts.push('cjs');

module.exports = withNativeWind(config, { input: './global.css' });


