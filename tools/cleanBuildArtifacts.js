/**
 * Copyright (c) 2020-2022 Kenneth Tran and CAD Team
 * (https://github.com/Cookie-AutoDelete/Cookie-AutoDelete/graphs/contributors)
 * Licensed under MIT
 * (https://github.com/Cookie-AutoDelete/Cookie-AutoDelete/blob/3.X.X-Branch/LICENSE)
 */
const fs = require('fs');
const path = require('path');

const ROOTDIR = path.resolve(__dirname, '..');
const generatedDirectories = [
  path.join(ROOTDIR, 'builds'),
  path.join(ROOTDIR, 'extension', 'bundles'),
];
const generatedGlobalFiles = [
  'bootstrap.min.css',
  'bootstrap.min.css.map',
  'bootstrap.bundle.min.js',
  'bootstrap.bundle.min.js.map',
  'jquery.slim.min.js',
  'jquery.slim.min.js.map',
  'browser-polyfill.min.js',
  'browser-polyfill.min.js.map',
].map((name) => path.join(ROOTDIR, 'extension', 'global_files', name));

for (const directory of generatedDirectories) {
  fs.rmSync(directory, { force: true, recursive: true });
}
for (const file of generatedGlobalFiles) {
  fs.rmSync(file, { force: true });
}
