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
const fs = require('fs');
const path = require('path');
const archiver = require('archiver');
const { generateManifest } = require('./generateManifest');
const { validateBuildStage } = require('./validateBuildStage');

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

const archiveDirectory = (sourceDir, filename) =>
  new Promise((resolve, reject) => {
    const outputPath = path.join(BUILDDIR, `${filename}.zip`);
    const output = fs.createWriteStream(outputPath);
    const archive = archiver('zip', { zlib: { level: 9 } });

    output.on('close', () => {
      console.log(`${archive.pointer()} total bytes`);
      console.log(`Created ${outputPath}`);
      resolve(outputPath);
    });
    output.on('error', reject);

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
    archive.finalize();
  });

const buildTarget = async (target, filename) => {
  console.log(`\nBuilding unsigned extension for ${target}...`);
  const stageDir = prepareStage(target);

  try {
    const zipPath = await archiveDirectory(stageDir, filename);
    if (target === 'firefox') {
      const xpiPath = path.join(BUILDDIR, `${filename}.xpi`);
      fs.copyFileSync(zipPath, xpiPath);
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
