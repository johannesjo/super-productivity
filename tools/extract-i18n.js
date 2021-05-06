const fs = require('fs');
const TRANSLATION_SRC = __dirname + '/../src/assets/i18n/en.json';

module.exports = () => {
  const _tr = fs.readFileSync(TRANSLATION_SRC);
  const tr = JSON.parse(_tr);

  const parse = (o, pref = '') => {
    return Object.keys(o).reduce((acc, key) => {
      console.log(key);

      if (typeof o[key] === 'object') {
        return {
          ...acc,
          [key]: parse(o[key], pref + key + '.'),
        };
      } else if (typeof o[key] === 'string') {
        return {
          ...acc,
          [key]: pref + key,
        };
      } else {
        throw 'Invalid Data';
      }
    }, {});
  };

  const parsed = parse(tr);
  const string = `const T = ${JSON.stringify(parsed, null, 2).replace(
    /"(\w+)":/g,
    '$1:',
  )};
export { T };
`.replace(/"/g, "'");

  fs.writeFileSync(__dirname + '/../src/app/t.const.ts', string, {
    overwrite: true,
    flag: 'w',
  });
};
