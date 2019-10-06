require('dotenv').config();
const {notarize} = require('electron-notarize');
const fs = require('fs');

exports.default = async function notarizing(context) {
  const {electronPlatformName, appOutDir} = context;
  if (electronPlatformName !== 'darwin') {
    return;
  }

  let appPath = `${appOutDir}/${appName}.app`;
  if (!fs.existsSync(appPath)) {
    throw new Error(`Cannot find application at: ${appPath}`);
  }

  const appName = context.packager.appInfo.productFilename;
  console.log(`Notarizing ${appName}`);
  try {
    await notarize({
      appBundleId: 'com.super-productvity.app',
      appPath,
      appleId: process.env.APPLEID,
      appleIdPassword: process.env.APPLEIDPASS,
    });
  } catch (e) {
    console.error(e);
  }
  console.log(`Notarizing DONE`);
};
