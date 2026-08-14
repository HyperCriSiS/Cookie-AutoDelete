/* istanbul ignore file: Redux init. */

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
import { Store } from 'redux';
import { ReduxAction } from '../typings/ReduxConstants';

export default class StoreUser {
  public static init(store: Store<State, ReduxAction>): void {
    StoreUser.store = store;
    if (StoreUser.resolveReady) {
      StoreUser.resolveReady(store);
      StoreUser.resolveReady = undefined;
    }
  }

  /**
   * Resolve as soon as the background store has been hydrated and initialized.
   * This replaces polling loops and is safe for event listeners that are
   * registered synchronously before asynchronous startup work completes.
   */
  public static ready(): Promise<Store<State, ReduxAction>> {
    if (StoreUser.store) {
      return Promise.resolve(StoreUser.store);
    }
    return StoreUser.readyPromise;
  }

  /**
   * Wrap a browser event handler so it can be registered synchronously while
   * deferring its actual work until the shared store is ready.
   */
  public static withStoreReady<P extends unknown[], R>(
    handler: (...args: P) => R,
  ): (...args: P) => Promise<R> {
    return async (...args: P): Promise<R> => {
      await StoreUser.ready();
      return handler(...args);
    };
  }

  protected static store: Store<State, ReduxAction>;

  private static resolveReady:
    | ((store: Store<State, ReduxAction>) => void)
    | undefined;

  private static readyPromise = new Promise<Store<State, ReduxAction>>(
    (resolve) => {
      StoreUser.resolveReady = resolve;
    },
  );
}
