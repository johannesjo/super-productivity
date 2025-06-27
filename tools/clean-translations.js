#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

const i18nDir = path.join(__dirname, '..', 'src', 'assets', 'i18n');
const enFile = path.join(i18nDir, 'en.json');

// Read and parse en.json
const enData = JSON.parse(fs.readFileSync(enFile, 'utf8'));

// Get all valid keys from en.json
function getAllKeys(obj, prefix = '') {
  let keys = [];
  for (const key in obj) {
    const fullKey = prefix ? `${prefix}.${key}` : key;
    if (typeof obj[key] === 'object' && obj[key] !== null && !Array.isArray(obj[key])) {
      keys = keys.concat(getAllKeys(obj[key], fullKey));
    } else {
      keys.push(fullKey);
    }
  }
  return keys;
}

// Remove keys from object that are not in validKeys
function cleanObject(obj, validKeys, prefix = '') {
  const cleaned = {};

  for (const key in obj) {
    const fullKey = prefix ? `${prefix}.${key}` : key;

    if (typeof obj[key] === 'object' && obj[key] !== null && !Array.isArray(obj[key])) {
      // Check if any valid key starts with this path
      const hasValidChild = validKeys.some((k) => k.startsWith(fullKey + '.'));
      if (hasValidChild) {
        const cleanedChild = cleanObject(obj[key], validKeys, fullKey);
        if (Object.keys(cleanedChild).length > 0) {
          cleaned[key] = cleanedChild;
        }
      }
    } else {
      // Check if this key exists in validKeys
      if (validKeys.includes(fullKey)) {
        cleaned[key] = obj[key];
      }
    }
  }

  return cleaned;
}

const validKeys = getAllKeys(enData);
console.log(`Found ${validKeys.length} valid keys in en.json`);

// Get all translation files
const translationFiles = fs
  .readdirSync(i18nDir)
  .filter((file) => file.endsWith('.json') && file !== 'en.json');

let totalRemoved = 0;

// Process each translation file
translationFiles.forEach((file) => {
  const filePath = path.join(i18nDir, file);
  const data = JSON.parse(fs.readFileSync(filePath, 'utf8'));

  const originalKeys = getAllKeys(data);
  const cleanedData = cleanObject(data, validKeys);
  const cleanedKeys = getAllKeys(cleanedData);

  const removedCount = originalKeys.length - cleanedKeys.length;
  totalRemoved += removedCount;

  if (removedCount > 0) {
    fs.writeFileSync(filePath, JSON.stringify(cleanedData, null, 2) + '\n', 'utf8');
    console.log(`${file}: Removed ${removedCount} orphaned keys`);
  } else {
    console.log(`${file}: No orphaned keys found`);
  }
});

console.log(`\nTotal orphaned keys removed: ${totalRemoved}`);
