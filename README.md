# Cookie AutoDelete

[![Mozilla Add-on](https://img.shields.io/amo/v/cookie-autodelete.svg)](https://addons.mozilla.org/firefox/addon/cookie-autodelete/)
[![Chrome Web Store](https://img.shields.io/chrome-web-store/v/fhcgjolkccmbidfldomjliifgaodjagh.svg)](https://chrome.google.com/webstore/detail/cookie-autodelete/fhcgjolkccmbidfldomjliifgaodjagh)
[![Microsoft Edge Add-ons](https://img.shields.io/badge/dynamic/json?label=edge&query=%24.version&url=https%3A%2F%2Fmicrosoftedge.microsoft.com%2Faddons%2Fgetproductdetailsbycrxid%2Fdjkjpnciiommncecmdefpdllknjdmmmo)](https://microsoftedge.microsoft.com/addons/detail/djkjpnciiommncecmdefpdllknjdmmmo)
[![GitHub license](https://img.shields.io/github/license/Cookie-AutoDelete/Cookie-AutoDelete.svg)](https://github.com/Cookie-AutoDelete/Cookie-AutoDelete/blob/3.X.X-Branch/LICENSE)
[![GitHub release](https://img.shields.io/github/release/Cookie-AutoDelete/Cookie-AutoDelete.svg)](https://github.com/Cookie-AutoDelete/Cookie-AutoDelete/releases)
[![GitHub issues](https://img.shields.io/github/issues/Cookie-AutoDelete/Cookie-AutoDelete.svg)](https://github.com/Cookie-AutoDelete/Cookie-AutoDelete/issues)
[![GitHub pull requests](https://img.shields.io/github/issues-pr/Cookie-AutoDelete/Cookie-AutoDelete.svg)](https://github.com/Cookie-AutoDelete/Cookie-AutoDelete/pulls)
[![Coverage Status](https://coveralls.io/repos/github/Cookie-AutoDelete/Cookie-AutoDelete/badge.svg?branch=3.X.X-Branch)](https://coveralls.io/github/Cookie-AutoDelete/Cookie-AutoDelete?branch=3.X.X-Branch)
[![codecov](https://codecov.io/gh/Cookie-AutoDelete/Cookie-AutoDelete/branch/3.X.X-Branch/graph/badge.svg?token=r3lpRXe5Vf)](https://codecov.io/gh/Cookie-AutoDelete/Cookie-AutoDelete)

Control your cookies! This extension is inspired by [Self-Destructing Cookies](https://addons.mozilla.org/firefox/addon/self-destructing-cookies/). When a tab closes, any cookies not being used are automatically deleted. Keep the ones you trust (forever/until restart) while deleting the rest. Containers Supported!

## Main Features

- Auto Deletes Cookies from Closed Tabs
- WhiteList/GreyList Support for Cookies
- Easily Export/Import your Whitelist/Greylist
- Clear All Cookies for a Domain
- Supports Manual Mode Cleaning from the popup
- Easily See the Number of Cookies for a site
- Support for Container Tabs (Firefox 53+)
- LocalStorage Support (Firefox 58+)
- Protect Cookies via Open Tabs
- Domain Change Cookie Cleanup
- Support for List of Expressions
- Easily Create an Expression for a Site
- Clean Cookies from Discarded/Unloaded Tabs
- Cookie Cleanup on Startup
- Support for Cleaning the following Browsing Data:
  - Cache
  - IndexedDB
  - LocalStorage
  - Plugin Data
  - Service Workers

## Usage

1. Add the sites you want to keep cookies for to the whitelist (permanently) or greylist (until browser restart)
2. Enable "Automatic Cleaning" in settings or "Auto-Clean" in popup
3. Watch those unused cookies disappear :)

## Contributing

### Found a bug? Have a suggestion?

- Read the [FAQ](https://github.com/Cookie-AutoDelete/Cookie-AutoDelete/wiki/FAQ:-Common-Questions-and-Issues)
- Read the [Documentation](https://github.com/Cookie-AutoDelete/Cookie-AutoDelete/wiki/Documentation)
- Check the [existing issues](https://github.com/Cookie-AutoDelete/Cookie-AutoDelete/issues)
- Create a [new issue](https://github.com/Cookie-AutoDelete/Cookie-AutoDelete/issues/new/choose)

### Want to help with translations?

- Visit our [Crowdin](https://crowdin.com/project/cookie-autodelete) project

### Want to develop?

We follow the [GitHub Flow](https://guides.github.com/introduction/flow/) process for contributing code.

1. Fork this repository to your own GitHub account and then clone it to your local device
2. Install dependencies: `npm install`
3. Create an unpacked MV3 development build for the browser you want to test:
   - Chromium/Chrome/Brave/Edge: `npm run dev:chromium`
   - Firefox: `npm run dev:firefox`
4. Load the generated extension from:
   - Chromium: `builds/dev-chromium`
   - Firefox: select `builds/dev-firefox/manifest.json` as a temporary add-on in `about:debugging`
5. Re-run the corresponding `dev:*` command after source changes.

The development build is generated from the same shared Manifest V3 base and browser-specific overlays used by release packaging. Source manifests are not rewritten during the build.

If there are any bugs that only a certain browser has, and you have the fix for it, please provide as much documentation as possible. Thank you!

## Other Cookie Managers

If you are looking for an alternative cookie manager, see:

- [CookieBro](https://nodetics.com/cookiebro/)
- [Cookie Quick Manager](https://addons.mozilla.org/firefox/addon/cookie-quick-manager/)

## Contributors

See the full [contributors graph](https://github.com/Cookie-AutoDelete/Cookie-AutoDelete/graphs/contributors).

## Support / Donations

If you find this extension useful, you can support the project through [Liberapay](https://liberapay.com/Cookie-AutoDelete/).

## License

Cookie AutoDelete is licensed under the [MIT License](LICENSE).
