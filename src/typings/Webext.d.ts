/* eslint-disable @typescript-eslint/no-unused-vars */
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

/** Cross-browser compatibility additions on top of @types/firefox-webext-browser. */
interface EvListener<T extends (...args: any[]) => any> {
  addListener(callback: T): void;
  removeListener(callback: T): void;
  hasListener(callback: T): boolean;
}

declare namespace browser.cookies {
  type CookiePartitionKey = PartitionKey;
}

/**
 * Cross-browser cookie shape used inside CAD. Firefox exposes
 * `firstPartyDomain`, while Chromium cookies may omit it entirely.
 */
type CadCookie = Omit<
  browser.cookies.Cookie,
  'firstPartyDomain' | 'partitionKey'
> & {
  firstPartyDomain?: string;
  partitionKey?: browser.cookies.CookiePartitionKey;
};

declare namespace browser.contextualIdentities {
  type contextualIdentitiesChangeInfo = {
    contextualIdentity: ContextualIdentity;
  };
}

declare namespace browser.tabs {
  interface Tab {
    selected?: boolean;
  }

  interface TabChangeInfo extends _OnUpdatedChangeInfo {
    cookieChanged?: {
      removed: boolean;
      cookie: CadCookie;
      cause: browser.cookies.OnChangedCause;
    };
  }
}
