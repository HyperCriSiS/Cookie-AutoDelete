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
/* istanbul ignore file: Redux stuff.*/

import { applyMiddleware, createStore } from 'redux';
import { thunk } from 'redux-thunk';
import '../services/StoreBridge';
import reducer from './Reducers';

// eslint-disable-next-line @typescript-eslint/no-unused-vars
const consoleMessages = (store: any) => (next: any) => (action: any) => {
  // console.log(
  //   `dispatching action => ${action.type}
  // payload => ${JSON.stringify(action.payload)}`,
  // );

  return next(action);
};

export default (state = {}): any => {
  return createStore(reducer, state, applyMiddleware(thunk, consoleMessages));
};
