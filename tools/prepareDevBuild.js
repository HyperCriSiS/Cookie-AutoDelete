/**
 * Copyright (c) 2020-2022 Kenneth Tran and CAD Team
 * (https://github.com/Cookie-AutoDelete/Cookie-AutoDelete/graphs/contributors)
 * Licensed under MIT
 * (https://github.com/Cookie-AutoDelete/Cookie-AutoDelete/blob/3.X.X-Branch/LICENSE)
 */
const fs = require('fs');
const path = require('path');
const { generateManifest } = require('./generateManifest');

const target = process.argv[2];
if (!['chromium', 'firefox'].includes(target)) {
  console.error('Usage: node tools/prepareDevBuild.js <chromium|firefox>');
  process.exitCode = 1;
  return;
}

const rootDir = path.resolve(__dirname, '..');
const sourceDir = path.join(rootDir, 'extension');
const outputDir = path.join(rootDir, 'builds', `dev-${target}`);

fs.rmSync(outputDir, { force: true, recursive: true });
fs.mkdirSync(path.dirname(outputDir), { recursive: true });
fs.cpSync(sourceDir, outputDir, {
  recursive: true,
  filter(source) {
    return path.basename(source) !== 'redux-webext.js';
  },
});

generateManifest(target, path.join(outputDir, 'manifest.json'));

if (target === 'firefox') {
  fs.rmSync(path.join(outputDir, 'background.js'), { force: true });
}

console.log(
  `Prepared unpacked ${target} MV3 extension at ${path.relative(
    rootDir,
    outputDir,
  )}`,
);
