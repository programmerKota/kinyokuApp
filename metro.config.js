// Metro configuration with compatibility shims for Expo SDK 53
const { getDefaultConfig } = require('@expo/metro-config');
const path = require('path');

const projectRoot = __dirname;
const config = getDefaultConfig(projectRoot);

// Shim missing deep Metro private imports expected by @expo/metro-config in some environments
config.resolver ??= {};
config.resolver.extraNodeModules = {
  ...(config.resolver.extraNodeModules || {}),
  'metro/src/ModuleGraph/worker/importLocationsPlugin': path.resolve(
    __dirname,
    'shims/metro-importLocationsPlugin.js'
  ),
};

module.exports = config;

