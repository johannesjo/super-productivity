const webpack = require('webpack');

module.exports = (webpackConfig) => {
  // The environment variables are already loaded by dotenv-run CLI
  // We pass all environment variables through DefinePlugin

  // Create an object with all env vars we want to expose
  const envVars = {};

  // List of environment variables to expose to the app
  const allowedEnvVars = [
    'NODE_ENV',
    'PRODUCTION',
    'STAGE',
    // Add your custom environment variables here
    'TEST_ENV_VAR',
    'GOOGLE_DRIVE_TOKEN',
    'DROPBOX_API_KEY',
    'WEBDAV_URL',
    'WEBDAV_USERNAME',
    'WEBDAV_PASSWORD',
  ];

  // Build the DefinePlugin config
  allowedEnvVars.forEach((key) => {
    if (process.env[key] !== undefined) {
      envVars[`process.env.${key}`] = JSON.stringify(process.env[key]);
    }
  });

  webpackConfig.plugins.push(new webpack.DefinePlugin(envVars));

  return webpackConfig;
};
