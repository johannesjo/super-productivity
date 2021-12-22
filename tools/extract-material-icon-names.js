const fs = require('fs');

// download from https://fonts.google.com/metadata/icons
const SRC = __dirname + '/../json.txt';
const OUT = __dirname + '/../icon-names.json';

const ic = fs.readFileSync(SRC, { encoding: 'utf8' });

const icons = JSON.parse(ic).icons;
const iconNames = icons.map((icon) => icon.name);

fs.writeFileSync(OUT, JSON.stringify(iconNames), {
  overwrite: true,
  flag: 'w',
});
