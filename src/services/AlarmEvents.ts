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

import { cookieCleanup } from '../redux/Actions';
import { getSetting, sleep } from './Libs';
import StoreUser from './StoreUser';

export default class AlarmEvents extends StoreUser {
  public static readonly ACTIVE_MODE_ALARM = 'activeModeAlarm';

  /**
   * Schedule one cleanup for tab-driven events.
   *
   * A real browser alarm acts as a cross-worker lock and wake-up fallback. For
   * short delays we additionally keep the existing timer semantics so a normal
   * 1-59 second delay is not silently stretched on older supported Chromium
   * versions. If that timer is lost because the worker dies, the browser alarm
   * still guarantees an eventual cleanup.
   */
  public static createActiveModeAlarm = async (): Promise<void> => {
    const existing = await browser.alarms.get(AlarmEvents.ACTIVE_MODE_ALARM);
    if (existing) return;

    const configuredSeconds = Number.parseInt(
      String(
        getSetting(StoreUser.store.getState(), SettingID.CLEAN_DELAY) as string,
      ),
      10,
    );
    const milliseconds =
      (Number.isFinite(configuredSeconds) && configuredSeconds > 0
        ? configuredSeconds
        : 0.5) * 1000;

    browser.alarms.create(AlarmEvents.ACTIVE_MODE_ALARM, {
      when: Date.now() + milliseconds,
    });

    if (milliseconds < AlarmEvents.RELIABLE_ALARM_DELAY_MS) {
      void AlarmEvents.runShortDelay(milliseconds);
    }
  };

  public static onAlarm = async (alarm: browser.alarms.Alarm): Promise<void> => {
    if (alarm.name !== AlarmEvents.ACTIVE_MODE_ALARM) return;
    AlarmEvents.dispatchCleanup();
  };

  private static async runShortDelay(milliseconds: number): Promise<void> {
    await sleep(milliseconds);

    // If the alarm already fired, or active mode was disabled and the alarm was
    // cleared, there is nothing left for the short timer to claim.
    const alarm = await browser.alarms.get(AlarmEvents.ACTIVE_MODE_ALARM);
    if (!alarm) return;

    // Claim the scheduled cleanup by clearing the alarm. If it fired between
    // get() and clear(), the onAlarm handler owns the cleanup instead.
    const claimed = await browser.alarms.clear(AlarmEvents.ACTIVE_MODE_ALARM);
    if (!claimed) return;

    AlarmEvents.dispatchCleanup();
  }

  private static dispatchCleanup(): void {
    if (!getSetting(StoreUser.store.getState(), SettingID.ACTIVE_MODE)) return;

    StoreUser.store.dispatch<any>(
      cookieCleanup({
        greyCleanup: false,
        ignoreOpenTabs: false,
      }),
    );
  }

  // Chrome only reduced the packed-extension alarm minimum from 60 to 30
  // seconds in Chrome 120. Because our current Chromium floor is 102, delays
  // below one minute use the precise timer path and keep the alarm as fallback.
  private static readonly RELIABLE_ALARM_DELAY_MS = 60 * 1000;
}

// Register synchronously when this background-only service module is loaded.
// The wrapper defers the handler body until state hydration is complete.
if (browser.alarms?.onAlarm) {
  browser.alarms.onAlarm.addListener(
    StoreUser.withStoreReady(AlarmEvents.onAlarm),
  );
}
