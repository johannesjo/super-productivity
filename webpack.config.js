const webpack = require('webpack');

module.exports = (webpackConfig) => {
  // The environment variables are already loaded by dotenv-run CLI
  // We just need to pass them through DefinePlugin

  webpackConfig.plugins.push(
    new webpack.DefinePlugin({
      'process.env.PRODUCTION': JSON.stringify(process.env.PRODUCTION),
      'process.env.STAGE': JSON.stringify(process.env.STAGE),
      'process.env.NODE_ENV': JSON.stringify(process.env.NODE_ENV),
    }),
  );

  return webpackConfig;
};
