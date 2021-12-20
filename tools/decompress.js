#! /usr/bin/env node
const lzString = require('lz-string');
const { readFileSync, writeFileSync } = require('fs');

const OUT = 'out.json';

const file = process.argv[process.argv.length - 1];

const res = readFileSync(file, { encoding: 'utf8' });

const decompressed = lzString.decompressFromUTF16(res);

// that should normally work...
// const decompressed = lzString.decompress(res);

console.log(decompressed);

writeFileSync(OUT, decompressed);
