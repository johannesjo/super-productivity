import fs from 'fs';
import path from 'path';
import archiver from 'archiver';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.dirname(__dirname);

// Read manifest to get plugin name
const manifest = JSON.parse(
  fs.readFileSync(path.join(projectRoot, 'src/manifest.json'), 'utf8'),
);
const outputFileName = `${manifest.id}-v${manifest.version}.zip`;

// Create output stream
const output = fs.createWriteStream(path.join(projectRoot, outputFileName));
const archive = archiver('zip', {
  zlib: { level: 9 }, // Maximum compression
});

output.on('close', () => {
  console.log(`Plugin packaged successfully: ${outputFileName}`);
  console.log(`Total size: ${(archive.pointer() / 1024).toFixed(2)} KB`);
});

archive.on('error', (err) => {
  throw err;
});

// Pipe archive data to the file
archive.pipe(output);

// Add dist files to the archive
const distPath = path.join(projectRoot, 'dist');

// Add manifest.json from src (it's copied to dist during build)
archive.file(path.join(projectRoot, 'src/manifest.json'), { name: 'manifest.json' });

// Add all files from dist
archive.glob('**/*', {
  cwd: distPath,
  ignore: ['manifest.json'], // We already added it from src
});

// Finalize the archive
archive.finalize();
