// Igual que en 06-Peliculas: Metro procesa global.css con NativeWind.
const { getDefaultConfig } = require('expo/metro-config');
const { withNativeWind } = require('nativewind/metro');

const config = getDefaultConfig(__dirname);

module.exports = withNativeWind(config, {
  input: './src/global.css',
  configPath: './tailwind.config.js',
  typescriptEnvPath: './src/nativewind-env.d.ts',
});
