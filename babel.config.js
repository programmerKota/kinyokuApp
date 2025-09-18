module.exports = function (api) {
  api.cache(true);
  return {
    presets: ['babel-preset-expo'],
    plugins: [
      [
        'module-resolver',
        {
          extensions: ['.ts', '.tsx', '.js', '.jsx', '.json'],
          alias: {
            '@app': './src/app',
            '@core': './src/core',
            '@features': './src/features',
            '@shared': './src/shared',
            '@project-types': './src/types'
          }
        }
      ]
    ]
  };
};
