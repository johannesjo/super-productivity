const extractI18n = require('./extract-i18n');
const fs = require('fs');
const MAIN_TRANSLATION_FILE = __dirname + '/../src/assets/i18n/en.json';

fs.watchFile(MAIN_TRANSLATION_FILE, () => {
  try {
    extractI18n();
  } catch (e) {
    console.error(e);
  }
});
