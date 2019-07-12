const fs = require('fs');
const path = __dirname + '/../src/assets/i18n/en.json';
console.log(path);

const _tr = fs.readFileSync(path);
const tr = JSON.parse(_tr);

const parse = (o) => {
  return Object.keys(o).reduce((acc, key) => {
    console.log(key);

    if (typeof o[key] === 'object') {
      return {
        ...acc,
        [key]: parse(o[key]),
      };
    } else if (typeof o[key] === 'string') {
      return {
        ...acc,
        [key]: key,
      };
    } else {
      throw 'Invalid Data';
    }
  }, {});
};

const parsed = parse(tr);
console.log(parsed);
const string = `export const T = ${JSON.stringify(parsed, null, 2)};
`.replace(/"/g, '\'');


fs.writeFileSync(__dirname + '/../src/app/t.const.ts', string, {
  overwrite: true,
  flag: 'w'
});
