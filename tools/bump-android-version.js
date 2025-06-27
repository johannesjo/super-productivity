const fs = require('fs');
const path = require('path');

// Read the version from package.json
const packageJson = require('../package.json');
const version = packageJson.version;

if (version.includes('-' || version.includes('rc'))) {
  console.log('Version contains - or rc – skipping android version bump');
  return;
}

String.prototype.insertAt = function (index, string) {
  return this.substr(0, index) + string + this.substr(index);
};

// Define the path to build.gradle
const gradleFilePath = path.join(__dirname, '..', 'android', 'app', 'build.gradle');

// Read the build.gradle file
let gradleFileContent = fs.readFileSync(gradleFilePath, 'utf8');

// Update the versionCode and versionName
const versionCodeDroid =
  version
    .split('.')
    .map((num) => num.padStart(2, '0'))
    .join('') * 10000;
const versionCodeDroidWithUnderscores = versionCodeDroid
  .toString()
  .insertAt(6, '_')
  .insertAt(4, '_')
  .insertAt(2, '_');

gradleFileContent = gradleFileContent.replace(
  /versionCode (\d|_)+/g,
  `versionCode ${versionCodeDroidWithUnderscores}`,
);
gradleFileContent = gradleFileContent.replace(
  /versionName "[^"]+"/g,
  `versionName "${version}"`,
);

// Write the updated content back to build.gradle
fs.writeFileSync(gradleFilePath, gradleFileContent, 'utf8');

console.log(`Updated build.gradle to version ${version}`);

// CREATE fastlane changelog file
// Define the paths
const changelogPath = path.join(__dirname, '..', 'CHANGELOG.md');
const outputDir = path.join(
  __dirname,
  '..',
  'android',
  'fastlane',
  'metadata',
  'android',
  'en-US',
  'changelogs',
);
const outputFilePath = path.join(outputDir, `${versionCodeDroid}.txt`);

// Read the changelog.md file
const changelogContent = fs.readFileSync(changelogPath, 'utf8');

// Extract the latest changes
const lines = changelogContent.split('\n').slice(2); // Remove the first two lines;
let latestChanges = '';
let headerCount = 0;

for (const line of lines) {
  if (line.startsWith('# [') || line.startsWith('## [')) {
    headerCount++;
    if (headerCount === 1) break;
  }
  latestChanges += line + '\n';
}
// Remove all links from the extracted text
latestChanges = latestChanges
  .replace(/\[([^\]]+)\]\([^\)]+\)/g, '$1')
  .replace(/\s*\([a-f0-9]{7}\)\s*$/gm, '');

// Ensure the output directory exists
if (!fs.existsSync(outputDir)) {
  fs.mkdirSync(outputDir, { recursive: true });
}

// Write the latest changes to the versioned changelog file
fs.writeFileSync(outputFilePath, latestChanges, 'utf8');

console.log(`Wrote latest changes to ${outputFilePath}`);
// console.log(latestChanges);
