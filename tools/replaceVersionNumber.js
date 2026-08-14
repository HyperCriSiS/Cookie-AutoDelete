const fs = require('fs');
const path = require('path');

const ROOTDIR = process.cwd();
const REGVER = /^\d+\.\d+\.\d+$/;

function changeVersion(filePath, version) {
  const jsonData = JSON.parse(fs.readFileSync(filePath, 'utf8'));
  if (jsonData.version === undefined) {
    throw new Error(`No version key found in ${filePath}`);
  }

  if (jsonData.version === version) {
    console.log('Version is already updated to %s on %s', version, filePath);
    return;
  }

  console.log('Replacing old version number: %s', jsonData.version);
  jsonData.version = version;
  fs.writeFileSync(filePath, `${JSON.stringify(jsonData, null, 2)}\n`);
  console.log(
    'Finished updating version number to %s on: %s',
    jsonData.version,
    filePath,
  );
}

console.log(
  '\nUsing NodeJS Version %s on %s %s',
  process.version,
  process.platform,
  process.arch,
);
console.log('Current Process Directory:  %s', ROOTDIR);
console.log('\nGITHUB_REF:  %s', process.env.GITHUB_REF);
console.log('TRAVIS_TAG:  %s', process.env.TRAVIS_TAG);

let versionTag = process.env.GITHUB_REF || process.env.TRAVIS_TAG || '';

if (versionTag.startsWith('refs/tags/')) {
  versionTag = versionTag.slice(10);
}
if (versionTag.startsWith('v')) {
  versionTag = versionTag.slice(1);
}

if (versionTag && !REGVER.test(versionTag)) {
  console.warn('Version Tag [ %s ] is not in valid semver form.', versionTag);
  versionTag = '';
}

if (!versionTag) {
  console.log(
    '\nGITHUB_REF or TRAVIS_TAG version tag does not exist or is not valid. Presuming non-publishing version. No replacements done.',
  );
  return;
}

console.log('\nVersion Tag is valid. Checking NPM Package Version.');
const packagePath = path.join(ROOTDIR, 'package.json');
const packageJson = JSON.parse(fs.readFileSync(packagePath, 'utf8'));
const packageVersion = packageJson.version;

if (!packageVersion) {
  throw new Error('Version does not exist in package.json.');
}
if (!REGVER.test(packageVersion)) {
  throw new Error('package.json version is not in valid semver form.');
}

console.log('Version from CI Tag:   %s', versionTag);
console.log('Version from NPM pkg:  %s', packageVersion);
if (packageVersion !== versionTag) {
  throw new Error(
    'Version Tag does not match package.json version. Revise one of them before publishing.',
  );
}

// The browser manifests are generated from this shared MV3 base. Do not mutate
// extension/manifest.json: it is a legacy source artifact and is no longer the
// packaging source of truth.
changeVersion(path.join(ROOTDIR, 'manifest', 'base.json'), versionTag);
console.log(`Manifest base updated to ${versionTag}.`);
