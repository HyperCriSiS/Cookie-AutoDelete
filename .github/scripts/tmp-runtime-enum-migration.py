from pathlib import Path
import os
import re

ENUM_SYMBOLS = (
    'browserName',
    'SiteDataType',
    'SettingID',
    'ListType',
    'ReasonClean',
    'OpenTabStatus',
)

enum_file = Path('src/typings/Enums.ts')
enum_text = enum_file.read_text()
additions = r'''

export enum browserName {
  Firefox = 'Firefox',
  Chrome = 'Chrome',
  Safari = 'Safari',
  Opera = 'Opera',
  IE = 'IE',
  Edge = 'Edge',
  EdgeChromium = 'EdgeChromium',
  Blink = 'Blink',
  Unknown = 'UnknownBrowser',
}

export enum SiteDataType {
  CACHE = 'Cache',
  INDEXEDDB = 'IndexedDB',
  LOCALSTORAGE = 'LocalStorage',
  PLUGINDATA = 'PluginData',
  SERVICEWORKERS = 'ServiceWorkers',
}

export enum SettingID {
  ACTIVE_MODE = 'activeMode',
  CLEAN_DELAY = 'delayBeforeClean',
  CLEAN_DISCARDED = 'discardedCleanup',
  CLEAN_DOMAIN_CHANGE = 'domainChangeCleanup',
  CLEAN_EXPIRED = 'cleanExpiredCookies',
  CLEAN_OPEN_TABS_STARTUP = 'cleanCookiesFromOpenTabsOnStartup',
  CLEANUP_CACHE = 'cacheCleanup',
  CLEANUP_INDEXEDDB = 'indexedDBCleanup',
  CLEANUP_LOCALSTORAGE = 'localStorageCleanup',
  CLEANUP_LOCALSTORAGE_OLD = 'localstorageCleanup',
  CLEANUP_PLUGINDATA = 'pluginDataCleanup',
  CLEANUP_SERVICEWORKERS = 'serviceWorkersCleanup',
  CONTEXT_MENUS = 'contextMenus',
  CONTEXTUAL_IDENTITIES = 'contextualIdentities',
  CONTEXTUAL_IDENTITIES_AUTOREMOVE = 'contextualIdentitiesAutoRemove',
  DEBUG_MODE = 'debugMode',
  ENABLE_GREYLIST = 'enableGreyListCleanup',
  ENABLE_NEW_POPUP = 'enableNewVersionPopup',
  KEEP_DEFAULT_ICON = 'keepDefaultIcon',
  NOTIFY_AUTO = 'showNotificationAfterCleanup',
  NOTIFY_MANUAL = 'manualNotifications',
  NOTIFY_DURATION = 'notificationOnScreen',
  NUM_COOKIES_ICON = 'showNumOfCookiesInIcon',
  OLD_GREY_CLEAN_LOCALSTORAGE = 'greyCleanLocalstorage',
  OLD_WHITE_CLEAN_LOCALSTORAGE = 'whiteCleanLocalstorage',
  SITEDATA_EMPTY_ON_ENABLE = 'siteDataEmptyOnEnable',
  SIZE_POPUP = 'sizePopup',
  SIZE_SETTING = 'sizeSetting',
  STAT_LOGGING = 'statLogging',
}

export enum ListType {
  WHITE = 'WHITE',
  GREY = 'GREY',
}

export enum ReasonClean {
  StartupNoMatchedExpression = 'reasonCleanStartupNoList',
  StartupCleanupAndGreyList = 'reasonCleanGreyList',
  NoMatchedExpression = 'reasonCleanNoList',
  MatchedExpressionButNoCookieName = 'reasonCleanCookieName',
  ExpiredCookie = 'reasonCleanCookieExpired',
  ExpiredCookieRestart = 'reasonCleanCookieExpiredRestart',
  CADSiteDataCookie = 'reasonCADSiteDataCookie',
  CADSiteDataCookieRestart = 'reasonCADSiteDataCookieRestart',
}

export enum OpenTabStatus {
  TabsWasNotIgnored = 'reasonTabsWereNotIgnored',
  TabsWereIgnored = 'reasonTabsWereIgnored',
}
'''
if 'export enum browserName' not in enum_text:
    enum_file.write_text(enum_text.rstrip() + additions.rstrip() + '\n')

global_path = Path('src/typings/Global.d.ts')
global_text = global_path.read_text()
for name in ('browserName', 'SiteDataType', 'SettingID', 'ListType'):
    replacement = f"type {name} = import('./Enums').{name};"
    pattern = rf'declare const enum {name} \{{.*?\n\}}'
    global_text, count = re.subn(pattern, replacement, global_text, count=1, flags=re.S)
    if count != 1:
        raise SystemExit(f'Expected exactly one ambient {name} declaration, found {count}')
global_path.write_text(global_text)

cleanup_path = Path('src/typings/Cleanup.d.ts')
cleanup_text = cleanup_path.read_text()
for name in ('ReasonClean', 'OpenTabStatus'):
    replacement = f"type {name} = import('./Enums').{name};"
    pattern = rf'declare const enum {name} \{{.*?\n\}}'
    cleanup_text, count = re.subn(pattern, replacement, cleanup_text, count=1, flags=re.S)
    if count != 1:
        raise SystemExit(f'Expected exactly one ambient {name} declaration, found {count}')
cleanup_path.write_text(cleanup_text)

enum_target = enum_file.resolve()


def insert_import(text: str, statement: str) -> str:
    first_import = re.search(r'^import\s', text, flags=re.M)
    if first_import:
        return text[:first_import.start()] + statement + '\n' + text[first_import.start():]
    if text.startswith('/**') or text.startswith('/*'):
        end = text.find('*/')
        if end != -1:
            end += 2
            while end < len(text) and text[end] in '\r\n':
                end += 1
            return text[:end] + '\n\n' + statement + '\n' + text[end:]
    return statement + '\n' + text


changed_files = []
for root in (Path('src'), Path('__tests__')):
    if not root.exists():
        continue
    paths = sorted(set(root.rglob('*.ts')) | set(root.rglob('*.tsx')))
    for path in paths:
        if path.name.endswith('.d.ts') or path.resolve() == enum_target:
            continue
        text = path.read_text()
        used = [symbol for symbol in ENUM_SYMBOLS if re.search(rf'\b{symbol}\b', text)]
        if not used:
            continue
        relative = os.path.relpath(enum_target.with_suffix(''), path.parent.resolve()).replace(os.sep, '/')
        if not relative.startswith('.'):
            relative = './' + relative
        import_re = re.compile(
            rf"^import\s+\{{([^}}]+)\}}\s+from\s+['\"]{re.escape(relative)}['\"];?\s*$",
            re.M,
        )
        match = import_re.search(text)
        if match:
            existing = [item.strip() for item in match.group(1).split(',')]
            names = sorted(set(existing + used))
            replacement = f"import {{ {', '.join(names)} }} from '{relative}';"
            text = text[:match.start()] + replacement + text[match.end():]
        else:
            statement = f"import {{ {', '.join(used)} }} from '{relative}';"
            text = insert_import(text, statement)
        path.write_text(text)
        changed_files.append(str(path))

print(f'Added explicit runtime enum imports to {len(changed_files)} source/test files')
for path in changed_files:
    print(path)
