import fs from 'fs';
import path from 'path';
import archiver from 'archiver';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(__dirname, '..');
const distDir = path.resolve(rootDir, 'dist');
const packageJson = JSON.parse(
  fs.readFileSync(path.resolve(rootDir, 'package.json'), 'utf8'),
);

// Ensure dist exists
if (!fs.existsSync(distDir)) {
  console.error('❌ dist directory not found. Run npm run build first.');
  process.exit(1);
}

const zipName = `${packageJson.name}.zip`;
const output = fs.createWriteStream(path.join(rootDir, zipName));
const archive = archiver('zip', {
  zlib: { level: 9 }, // Sets the compression level.
});

output.on('close', function () {
  console.log(
    `✅ Plugin packaged successfully: ${zipName} (${archive.pointer()} total bytes)`,
  );
});

archive.on('warning', function (err) {
  if (err.code === 'ENOENT') {
    console.warn(err);
  } else {
    throw err;
  }
});

archive.on('error', function (err) {
  throw err;
});

archive.pipe(output);

// Append files from dist directory
archive.directory(distDir, false);

archive.finalize();
