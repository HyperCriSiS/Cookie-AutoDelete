/**
 * Copyright (c) 2017-2022 Kenny Do and CAD Team (https://github.com/Cookie-AutoDelete/Cookie-AutoDelete/graphs/contributors)
 * Licensed under MIT (https://github.com/Cookie-AutoDelete/Cookie-AutoDelete/blob/3.X.X-Branch/LICENSE)
 *
 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
 * IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
 * FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
 * AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
 * LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
 * OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
 * SOFTWARE.
 */

declare module '*.json';
// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-ignore
declare const global: any;
declare const browserDetect: () => browserName;

/**
 * This only works if browserDetect function doesn't change its return method/string.
 */
type browserName = import('./Enums').browserName;

type StoreIdToExpressionList = Readonly<{
  [storeId: string]: ReadonlyArray<Expression>;
}>;

type MapToSettingObject = Readonly<{ [setting: string]: Setting }>;

type CacheMap = Readonly<
  { [browserDetect: string]: browserName } & { [key: string]: any }
>;

type GetState = () => State;

type State = Readonly<{
  lists: StoreIdToExpressionList;
  cookieDeletedCounterTotal: number;
  cookieDeletedCounterSession: number;
  settings: MapToSettingObject;
  activityLog: ReadonlyArray<ActivityLog>;
  cache: CacheMap;
}>;

type Expression = Readonly<{
  expression: string;
  cleanAllCookies?: boolean;
  // Deprecated as of 3.5.0, but kept for backwards-compatibility for pre-3.4.0.
  cleanLocalStorage?: boolean;
  cleanSiteData?: SiteDataType[];
  listType: ListType;
  storeId: string;
  id?: string;
  cookieNames?: string[];
}>;

type SiteDataType = import('./Enums').SiteDataType;

type Setting = Readonly<{
  id?: string | number;
  name: string;
  value: boolean | number | string;
}>;

type SettingID = import('./Enums').SettingID;

type ListType = import('./Enums').ListType;

interface ReleaseNote {
  readonly version: string;
  readonly notes: string[];
}

type CookieCountMsg = Readonly<{
  popupHostname?: string;
  cookieUpdated?: boolean;
}>;

type CADLogItem = Readonly<{
  type?: string;
  level?: number;
  msg?: string;
  x?: any;
}>;

declare const enum EventListenerAction {
  ADD = 'ADD',
  REMOVE = 'REMOVE',
}

type JestSpyObject = { [s: string]: jest.SpyInstance };
