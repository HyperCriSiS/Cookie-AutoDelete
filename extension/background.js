/**
 * Copyright (c) 2017-2022 Kenny Do and CAD Team
 * (https://github.com/Cookie-AutoDelete/Cookie-AutoDelete/graphs/contributors)
 * Licensed under MIT
 * (https://github.com/Cookie-AutoDelete/Cookie-AutoDelete/blob/3.X.X-Branch/LICENSE)
 *
 * Chromium Manifest V3 service-worker loader. All scripts are local extension
 * resources; the application background code itself is built as a web-worker
 * bundle by webpack.
 */
importScripts(
  'global_files/browser-polyfill.min.js',
  'global_files/browserDetect.js',
  'bundles/background.bundle.js',
);
