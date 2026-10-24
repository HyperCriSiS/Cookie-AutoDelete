/**
 * Copyright (c) 2020-2022 Kenneth Tran and CAD Team
 * (https://github.com/Cookie-AutoDelete/Cookie-AutoDelete/graphs/contributors)
 * Licensed under MIT
 * (https://github.com/Cookie-AutoDelete/Cookie-AutoDelete/blob/3.X.X-Branch/LICENSE)
 *
 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
 * IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
 * FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
 * AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
 * LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
 * OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
 * SOFTWARE.
 */
const crypto = require('crypto');
const fs = require('fs');
const path = require('path');
const { generateManifest } = require('./generateManifest');
const { listFiles, validateBuildStage } = require('./validateBuildStage');

const BUILDS = 'builds';
const EXT = 'extension';
const EXTNAME = 'Cookie-AutoDelete_';
const ROOTDIR = process.cwd();
const BUILDDIR = path.join(ROOTDIR, BUILDS);
const EXTDIR = path.join(ROOTDIR, EXT);

console.log(
  '\n\nUsing NodeJS Version %s on %s %s',
  process.version,
  process.platform,
  process.arch,
);
console.log('Current Root Directory is:  %s', ROOTDIR);
console.log('GITHUB_REF:  %s', process.env.GITHUB_REF);
console.log('TRAVIS_TAG:  %s', process.env.TRAVIS_TAG);
console.log('GITSHA    :  %s', process.env.GITSHA);

let versionTag = process.env.GITHUB_REF || process.env.TRAVIS_TAG || '';

if (versionTag.startsWith('refs/tags/')) {
  versionTag = versionTag.slice(10);
}

if (versionTag && !RegExp(/^v?\d+\.\d+\.\d+$/).test(versionTag)) {
  console.warn('Version [ %s ] is not in valid semver form.', versionTag);
  versionTag = '';
}

if (!versionTag) {
  console.log(
    'Neither GITHUB_REF nor TRAVIS_TAG contained a valid semver version. Presuming non-publishing version.\nAdding Dev_ and using Date Format YYYYMMDD_HHMMSS as tag.',
  );
}

const sha = process.env.GITSHA ? `_${process.env.GITSHA.slice(0, 7)}` : '';
const tag =
  (versionTag ||
    'Dev_' +
      new Date(new Date().getTime() - new Date().getTimezoneOffset() * 60000)
        .toISOString()
        .replace(/T/, '_')
        .replace(/-|:|\..+/g, '')) +
  sha +
  '_';

console.log('TAG to append:  %s\n', tag);

const chromeFilename = `${EXTNAME}${tag}Chrome`;
const firefoxFilename = `${EXTNAME}${tag}Firefox`;

const shouldCopyToPackage = (source) => {
  const basename = path.basename(source);
  return (
    !basename.endsWith('.map') &&
    basename !== '.DS_Store' &&
    basename !== 'redux-webext.js'
  );
};

const prepareStage = (target) => {
  const stageDir = path.join(BUILDDIR, `.stage-${target}`);
  fs.rmSync(stageDir, { force: true, recursive: true });
  fs.mkdirSync(BUILDDIR, { recursive: true });
  fs.cpSync(EXTDIR, stageDir, {
    recursive: true,
    filter: shouldCopyToPackage,
  });

  generateManifest(target, path.join(stageDir, 'manifest.json'));

  // The service-worker loader is Chromium-only. Firefox uses background.scripts
  // from its generated manifest and does not need to package the unused loader.
  if (target === 'firefox') {
    fs.rmSync(path.join(stageDir, 'background.js'), { force: true });
  }

  validateBuildStage(target, stageDir, {
    production: true,
    sourceDir: EXTDIR,
  });

  return stageDir;
};

const normalizeArchiveEntry = (name) =>
  name.replaceAll('\\', '/').replace(/^\.\//, '');

const validateArchiveEntries = (sourceDir, archivedFiles, outputPath) => {
  const expectedFiles = listFiles(sourceDir);
  const actualFiles = [...archivedFiles].map(normalizeArchiveEntry).sort();

  const missing = expectedFiles.filter((file) => !actualFiles.includes(file));
  const unexpected = actualFiles.filter((file) => !expectedFiles.includes(file));

  if (missing.length || unexpected.length) {
    throw new Error(
      `Build archive validation failed for ${path.basename(outputPath)}: ` +
        `missing=[${missing.join(',')}] unexpected=[${unexpected.join(',')}]`,
    );
  }

  if (actualFiles.length !== expectedFiles.length) {
    throw new Error(
      `Build archive validation failed for ${path.basename(outputPath)}: ` +
        `expected ${expectedFiles.length} files but archived ${actualFiles.length}`,
    );
  }

  const outputSize = fs.statSync(outputPath).size;
  if (outputSize <= 0) {
    throw new Error(
      `Build archive validation failed for ${path.basename(outputPath)}: archive is empty`,
    );
  }

  console.log(
    `Validated ${path.basename(outputPath)} archive contents (${actualFiles.length} files).`,
  );
};

const archiveDirectory = async (sourceDir, filename) => {
  // Archiver 8 is ESM-only and exposes format-specific archive classes instead
  // of the legacy callable CommonJS export. Dynamic import keeps this existing
  // CommonJS build tool compatible without converting the entire tools folder.
  const { ZipArchive } = await import('archiver');

  return new Promise((resolve, reject) => {
    const outputPath = path.join(BUILDDIR, `${filename}.zip`);
    const output = fs.createWriteStream(outputPath);
    const archive = new ZipArchive({ zlib: { level: 9 } });
    const archivedFiles = [];

    output.on('close', () => {
      try {
        validateArchiveEntries(sourceDir, archivedFiles, outputPath);
        console.log(`${archive.pointer()} total bytes`);
        console.log(`Created ${outputPath}`);
        resolve(outputPath);
      } catch (error) {
        reject(error);
      }
    });
    output.on('error', reject);

    archive.on('entry', (entry) => {
      if (entry.type === 'file') archivedFiles.push(entry.name);
    });
    archive.on('warning', (error) => {
      if (error.code === 'ENOENT') {
        console.warn('ARCHIVER WARNING %s: %s', error.code, error.message);
        return;
      }
      reject(error);
    });
    archive.on('error', reject);

    archive.pipe(output);
    archive.directory(sourceDir, false);
    void archive.finalize().catch(reject);
  });
};

const fileSha256 = (filePath) =>
  crypto.createHash('sha256').update(fs.readFileSync(filePath)).digest('hex');

const validateFirefoxXpiCopy = (zipPath, xpiPath) => {
  const zipSize = fs.statSync(zipPath).size;
  const xpiSize = fs.statSync(xpiPath).size;
  if (zipSize !== xpiSize || fileSha256(zipPath) !== fileSha256(xpiPath)) {
    throw new Error(
      'Build archive validation failed: Firefox ZIP and XPI are not byte-identical',
    );
  }
  console.log('Validated Firefox ZIP/XPI byte identity.');
};

const buildTarget = async (target, filename) => {
  console.log(`\nBuilding unsigned extension for ${target}...`);
  const stageDir = prepareStage(target);

  try {
    const zipPath = await archiveDirectory(stageDir, filename);
    if (target === 'firefox') {
      const xpiPath = path.join(BUILDDIR, `${filename}.xpi`);
      fs.copyFileSync(zipPath, xpiPath);
      validateFirefoxXpiCopy(zipPath, xpiPath);
      console.log(`Created ${xpiPath}`);
    }
  } finally {
    fs.rmSync(stageDir, { force: true, recursive: true });
  }
};

const mainBuild = async () => {
  await buildTarget('firefox', firefoxFilename);
  await buildTarget('chromium', chromeFilename);
  console.log('\n\n> All Done! <\n');
};

mainBuild().catch((error) => {
  console.error('Build packaging failed.', error);
  process.exitCode = 1;
});
