// Igual que en 06-Peliculas: NativeWind 4 compila las clases de Tailwind.
module.exports = function (api) {
  api.cache(true);
  return {
    presets: [['babel-preset-expo', { jsxImportSource: 'nativewind' }], 'nativewind/babel'],
  };
};
