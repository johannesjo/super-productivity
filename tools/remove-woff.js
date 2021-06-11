/* eslint-env es6 */
const glob = require('glob');
const fs = require('fs');

// "removeWOFF2": "find dist/ -type f -iname '*.woff' -delete && find dist/ -type f -iname '*.css' -exec sed -i \"s/, url\\('.*'\\) format\\('woff'\\)//g\" {} \\;",

glob('dist/*.woff', function (er, files) {
  files.forEach((filePath) => {
    fs.unlinkSync(filePath);
  });
});

// NOTE: this would remove the dead references, but it should be no problem anyway
// glob('dist/*.css', function (er, files) {
//   files.forEach((filePath) => {
//     const fileContent = fs.readFileSync(filePath, { encoding: 'utf8' });
//     const newFileContent = fileContent
//       .replace(/,url\(.*\) format\('woff'\)/g, '')
//       .replace(/,url\(.*\) format\("woff"\)/g, '')
//       .replace(/url\(.*\) format\('woff'\)/g, '')
//       .replace(/url\(.*\) format\("woff"\)/g, '');
//     fs.writeFileSync(filePath, newFileContent);
//   });
// });
