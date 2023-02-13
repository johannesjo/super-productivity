/* eslint-env es6 */
const { readdir, readFile } = require('fs');
const BASE_PATH = 'src/assets/i18n';
readdir(BASE_PATH, (err, files) => {
  //handling error
  if (err) {
    console.log('Unable to scan directory: ' + err);
    process.exit(12345);
  }
  //listing all files using forEach
  files.forEach((file) => {
    // Do whatever you want to do with the file
    readFile(BASE_PATH + '/' + file, (err, data) => {
      if (err) {
        console.error(err);
        process.exit(12345);
      }
      try {
        JSON.parse(data.toString());
      } catch (e) {
        console.log(BASE_PATH + '/' + file);
        console.error(e);
        process.exit(12345);
      }
    });
  });
});
