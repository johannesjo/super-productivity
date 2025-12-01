const fs = require('fs');
const path = require('path');

const i18nDir = path.resolve(__dirname, '../src/assets/i18n');
const enPath = path.join(i18nDir, 'en.json');

function mergeInOrder(enObj, langObj) {
  if (typeof enObj !== 'object' || enObj === null) return langObj;
  const result = Array.isArray(enObj) ? [] : {};
  for (const key of Object.keys(enObj)) {
    if (
      typeof enObj[key] === 'object' &&
      enObj[key] !== null &&
      !Array.isArray(enObj[key])
    ) {
      result[key] = mergeInOrder(enObj[key], langObj && langObj[key] ? langObj[key] : {});
    } else {
      result[key] = langObj && key in langObj ? langObj[key] : enObj[key];
    }
  }
  return result;
}

if (!fs.existsSync(enPath)) {
  console.error('en.json not found in src/assets/i18n/');
  process.exit(1);
}

if (!fs.existsSync(i18nDir)) {
  console.error('i18n directory not found at src/assets/i18n/');
  process.exit(1);
}

// Read the English reference file
const en = JSON.parse(fs.readFileSync(enPath, 'utf8'));

// Get all i18n files except en.json
const i18nFiles = fs
  .readdirSync(i18nDir)
  .filter((file) => file.endsWith('.json') && file !== 'en.json')
  .sort();

console.log(`Found ${i18nFiles.length} language files to update:`);
console.log(i18nFiles.map((file) => `  - ${file}`).join('\n'));
console.log('');

let updatedFiles = 0;
let errors = 0;

// Process each language file
for (const file of i18nFiles) {
  const langPath = path.join(i18nDir, file);
  const langCode = file.replace('.json', '');

  try {
    // Read existing language file or create empty object if it doesn't exist
    let langObj = {};
    if (fs.existsSync(langPath)) {
      const content = fs.readFileSync(langPath, 'utf8');
      if (content.trim()) {
        langObj = JSON.parse(content);
      }
    }

    // Merge with English structure, preserving existing translations
    const merged = mergeInOrder(en, langObj);

    // Write the updated file
    fs.writeFileSync(langPath, JSON.stringify(merged, null, 2), 'utf8');

    console.log(`✓ Updated ${file}`);
    updatedFiles++;
  } catch (error) {
    console.error(`✗ Error processing ${file}:`);
    console.error(`   Path: ${langPath}`);
    console.error(`   Error: ${error.message}`);
    if (error.stack) {
      console.error(`   Stack: ${error.stack.split('\n')[1]?.trim()}`);
    }
    errors++;
  }
}

console.log('');
console.log(`Summary:`);
console.log(`  - Updated files: ${updatedFiles}`);
console.log(`  - Errors: ${errors}`);
console.log(`  - Total files processed: ${i18nFiles.length}`);

if (errors === 0) {
  console.log('');
  console.log(
    'All language files updated successfully with missing keys in the same order as en.json.',
  );
} else {
  console.log('');
  console.log('Some files had errors. Please check the output above.');
  process.exit(1);
}
