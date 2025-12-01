import fs from 'fs';
import path from 'path';
import archiver from 'archiver';
import { execSync } from 'child_process';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.resolve(__dirname, '..');
const distDir = path.join(projectRoot, 'dist');
const manifestPath = path.join(projectRoot, 'src/manifest.json');

function ensureBuild() {
  execSync('npm run build', { cwd: projectRoot, stdio: 'inherit' });
}

function packagePlugin() {
  if (!fs.existsSync(manifestPath)) {
    throw new Error('manifest.json not found in src/');
  }

  const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
  const outputFileName = `${manifest.id}-v${manifest.version}.zip`;
  const output = fs.createWriteStream(path.join(projectRoot, outputFileName));
  const archive = archiver('zip', { zlib: { level: 9 } });

  output.on('close', () => {
    console.log(
      `Plugin packaged successfully: ${outputFileName} (${(archive.pointer() / 1024).toFixed(
        2,
      )} KB)`,
    );
  });

  archive.on('error', (err) => {
    throw err;
  });

  archive.pipe(output);

  if (!fs.existsSync(distDir)) {
    throw new Error('dist folder not found. Run the build step first.');
  }

  archive.directory(distDir, false);

  return archive.finalize();
}

async function run() {
  ensureBuild();
  await packagePlugin();
}

run().catch((err) => {
  console.error(err);
  process.exit(1);
});
