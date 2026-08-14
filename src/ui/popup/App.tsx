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
import { Component } from 'react';
import { connect } from 'react-redux';
import { Dispatch } from 'redux';
import {
  addExpressionUI,
  cookieCleanupUI,
  updateSetting,
} from '../../redux/Actions';
import {
  CADCOOKIENAME,
  extractMainDomain,
  getHostname,
  getSetting,
  isAnIP,
  isChrome,
  isFirefoxNotAndroid,
  localFileToRegex,
  parseCookieStoreId,
} from '../../services/Libs';
import {
  getAllCookiesForDomainIncludingPartitions,
} from '../../services/CookieDomainService';
import { FilterOptions } from '../../typings/Enums';
import { ReduxAction } from '../../typings/ReduxConstants';
import ActivityTable from '../common_components/ActivityTable';
import IconButton from '../common_components/IconButton';
import CleanCollapseGroup from './components/CleanCollapseGroup';
import FilteredExpression from './components/FilteredExpression';
import { animateFlash } from './popupLib';

interface DispatchProps {
  onUpdateSetting: (newSetting: Setting) => void;
  onNewExpression: (payload: Expression) => void;
  onCookieCleanup: (payload: CleanupProperties) => void;
}

interface StateProps {
  contextualIdentities: boolean;
  state: State;
}

class InitialState {
  public cookieCount = 0;
  public tab: browser.tabs.Tab | undefined = undefined;
  public storeId = 'default';
}

type PopupAppComponentProps = DispatchProps & StateProps;

class App extends Component<PopupAppComponentProps, InitialState> {
  public state = new InitialState();
  public port: browser.runtime.Port | null = null;

  public async componentDidMount() {
    document.documentElement.style.fontSize = `${
      (this.props.state.settings[SettingID.SIZE_POPUP].value as number) || 16
    }px`;
    if (isChrome(this.props.state.cache)) {
      // Chrome requires min width otherwise the layout is messed up
      document.documentElement.style.minWidth = `${
        430 +
        (((this.props.state.settings[SettingID.SIZE_POPUP].value as number) ||
          16) -
          10) *
          35
      }px`;
    }
    const tabs = await browser.tabs.query({
      active: true,
      currentWindow: true,
    });

    this.setState({
      storeId: parseCookieStoreId(
        this.props.contextualIdentities,
        tabs[0].cookieStoreId,
      ),
      tab: tabs[0],
    });
  }

  public componentWillUnmount() {
    if (this.port) {
      this.port.disconnect();
      this.port = null;
    }
  }

  public async setPopupCookieCount() {
    const { state } = this.props;
    const { tab } = this.state;
    if (!tab || !tab.url) return;
    const cookies = await getAllCookiesForDomainIncludingPartitions(state, tab);

    this.setState({
      cookieCount: cookies
        ? cookies.length -
          cookies.filter((cookie) => cookie.name === CADCOOKIENAME).length
        : 0,
    });
  }

  public render() {
    const { tab, storeId } = this.state;
    if (!tab) {
      return 'Loading';
    }
    const {
      onNewExpression,
      onCookieCleanup,
      onUpdateSetting,
      contextualIdentities,
      state,
    } = this.props;
    const { cache, settings } = state;
    const hostname = getHostname(tab.url);
    const mainDomain = extractMainDomain(hostname);
    const addableHostnames = [
      hostname === mainDomain ? undefined : `*.${mainDomain}`,
      hostname,
    ].filter(Boolean) as string[];
    if (hostname !== '' && !isAnIP(tab.url) && !hostname.startsWith('file:')) {
      addableHostnames.push(`*.${hostname}`);
    }

    if (!this.port) {
      if (hostname) {
        this.port = browser.runtime.connect({
          name: `popupCAD_${hostname},${storeId.replace(',', '-')}`,
        });
        this.port.onMessage.addListener((m) => {
          const msg = m as CookieCountMsg;
          if (msg.cookieUpdated !== undefined && msg.cookieUpdated) {
            this.setPopupCookieCount();
          }
        });
        this.port.onDisconnect.addListener((p) => {
          if (p.error) {
            // eslint-disable-next-line no-console
            console.error(
              `Disconnected due to an error: ${browser.runtime.lastError}`,
            );
          }
          this.port = null;
        });
      }
    }

    return (
      <div
        id="cadPopup"
        className="container-fluid"
        style={{
          overflow: 'auto',
        }}
        onClick={(e) => {
          const _t = e.target as HTMLElement;
          const _ccg = document.getElementById('cleanCollapse');
          if (!_ccg || !_ccg.classList.contains('show')) return;
          const _dt = _t.attributes.getNamedItem('data-target');
          if (!_dt || _dt.value !== '#cleanCollapse') {
            _ccg.classList.remove('show');
          }
        }}
      >
        <div
          className="row pt-2"
          style={{
            alignItems: 'center',
            backgroundColor: 'rgba(0, 0, 0, 0.05)',
            justifyContent: 'center',
          }}
        >
          <span id="CADTitle">{browser.i18n.getMessage('extensionName')}</span>
          &nbsp;
          <span id="CADVersion" style={{ fontWeight: 'bold' }}>
            {browser.runtime.getManifest().version}
          </span>
        </div>
        <div
          className="row justify-content-center p-1"
          style={{
            alignItems: 'center',
            backgroundColor: 'rgba(0, 0, 0, 0.05)',
            borderBottom: '1px solid rgba(0, 0, 0, 0.1)',
          }}
        >
          <IconButton
            iconName="power-off"
            className={`btn-${
              settings[SettingID.ACTIVE_MODE].value ? 'success' : 'danger'
            } m-1`}
            onClick={() =>
              onUpdateSetting({
                ...settings[SettingID.ACTIVE_MODE],
                value: !settings[SettingID.ACTIVE_MODE].value,
              })
            }
            title={
              settings[SettingID.ACTIVE_MODE].value
                ? browser.i18n.getMessage('disableAutoDeleteText')
                : browser.i18n.getMessage('enableAutoDeleteText')
            }
            text={
              settings[SettingID.ACTIVE_MODE].value
                ? browser.i18n.getMessage('autoDeleteEnabledText')
                : browser.i18n.getMessage('autoDeleteDisabledText')
            }
          />
          <IconButton
            iconName={
              settings[SettingID.NOTIFY_AUTO].value ? 'bell' : 'bell-slash'
            }
            className={`btn-${
              settings[SettingID.NOTIFY_AUTO].value ? 'success' : 'danger'
            } m-1`}
            onClick={() =>
              onUpdateSetting({
                ...settings[SettingID.NOTIFY_AUTO],
                value: !settings[SettingID.NOTIFY_AUTO].value,
              })
            }
            title={browser.i18n.getMessage('toggleNotificationText')}
            text={
              settings[SettingID.NOTIFY_AUTO].value
                ? browser.i18n.getMessage('notificationEnabledText')
                : browser.i18n.getMessage('notificationDisabledText')
            }
          />
          <div className="btn-group" role="group">
            <IconButton
              iconName="trash-alt"
              className="btn-info m-1"
              onClick={() => {
                onCookieCleanup({ greyCleanup: false, ignoreOpenTabs: true });
                animateFlash(true, 'cadPopup');
              }}
              title={browser.i18n.getMessage('manualCleanText')}
              text={browser.i18n.getMessage('manualCleanText')}
            />
            <IconButton
              iconName="caret-down"
              className="btn-info dropdown-toggle dropdown-toggle-split m-1 ml-n1"
              dataTarget="#cleanCollapse"
              aria-expanded={false}
              aria-haspopup={true}
              title={browser.i18n.getMessage('manualCleanText')}
            />
          </div>
        </div>
        <CleanCollapseGroup tab={tab} />
        <FilteredExpression
          state={state}
          tab={tab}
          storeId={storeId}
          addableHostnames={addableHostnames}
          onNewExpression={onNewExpression}
        />
        <ActivityTable state={state} />
      </div>
    );
  }
}

const mapStateToProps = (state: State) => ({
  contextualIdentities: getSetting(
    state,
    SettingID.CONTEXTUAL_IDENTITIES,
  ) as boolean,
  state,
});

const mapDispatchToProps = (dispatch: Dispatch<ReduxAction>) => ({
  onCookieCleanup(payload: CleanupProperties) {
    dispatch(cookieCleanupUI(payload));
  },
  onNewExpression(payload: Expression) {
    dispatch(addExpressionUI(payload));
  },
  onUpdateSetting(payload: Setting) {
    dispatch(updateSetting(payload));
  },
});

export default connect(mapStateToProps, mapDispatchToProps)(App);
