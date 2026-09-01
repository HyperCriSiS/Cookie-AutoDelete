/**
 * Copyright (c) 2017-2022 Kenny Do and CAD Team
 * (https://github.com/Cookie-AutoDelete/Cookie-AutoDelete/graphs/contributors)
 * Licensed under MIT
 * (https://github.com/Cookie-AutoDelete/Cookie-AutoDelete/blob/3.X.X-Branch/LICENSE)
 *
 * Gets the browser name and caches the result. This implementation deliberately
 * avoids window/document so it can run in both extension pages and MV3 service
 * workers.
 *
 * @returns {string}
 */
var browserDetect = function () {
  if (browserDetect.prototype._cachedResult) {
    return browserDetect.prototype._cachedResult;
  }

  var userAgent =
    typeof navigator !== 'undefined' && navigator.userAgent
      ? navigator.userAgent
      : '';
  var hasContextualIdentities =
    typeof browser !== 'undefined' &&
    typeof browser.contextualIdentities !== 'undefined';

  var result = 'UnknownBrowser';

  if (hasContextualIdentities || /Firefox\//i.test(userAgent)) {
    result = 'Firefox';
  } else if (/Edg(?:A|iOS)?\//i.test(userAgent)) {
    result = 'EdgeChromium';
  } else if (/OPR\//i.test(userAgent) || /Opera\//i.test(userAgent)) {
    result = 'Opera';
  } else if (/Chrome\//i.test(userAgent) || /CriOS\//i.test(userAgent)) {
    result = 'Chrome';
  } else if (/Edge\//i.test(userAgent)) {
    result = 'Edge';
  } else if (/MSIE\s|Trident\//i.test(userAgent)) {
    result = 'IE';
  } else if (/Safari\//i.test(userAgent) && /Version\//i.test(userAgent)) {
    result = 'Safari';
  }

  browserDetect.prototype._cachedResult = result;
  return result;
};
