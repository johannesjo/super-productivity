require('dotenv').config();
const {notarize} = require('electron-notarize');
const fs = require('fs');

exports.default = async function notarizing(context) {
  const {electronPlatformName, appOutDir} = context;
  if (electronPlatformName !== 'darwin') {
    return;
  }

  const appName = context.packager.appInfo.productFilename;
  const appBundleId = context.packager.appInfo.macBundleIdentifier;
  const appPath = `${appOutDir}/${appName}.app`;
  if (!fs.existsSync(appPath)) {
    throw new Error(`Cannot find application at: ${appPath}`);
  }

  try {
    let envBefore = process.env.DEBUG;
    process.env.DEBUG = 'electron-notarize';
    await notarize({
      appBundleId,
      appPath,
      appleId: process.env.APPLEID,
      appleIdPassword: process.env.APPLEIDPASS,
    });
    process.env.DEBUG = envBefore;
  } catch (e) {
    console.error(e);
    throw new Error(e);
  }
  console.log(`Notarizing DONE`);
};
