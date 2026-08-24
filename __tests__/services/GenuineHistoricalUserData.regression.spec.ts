/**
 * Regression coverage backed by genuine public historical user data from the
 * upstream Cookie AutoDelete issue tracker.
 *
 * These fixtures are intentionally separate from release-schema fixtures:
 * every persisted setting/list value below was posted by a real CAD user.
 */

import fs from 'fs';
import path from 'path';
import { browserName, SettingID } from '../../src/typings/Enums';
import { validateSettings } from '../../src/redux/Actions';
import { initialState } from '../../src/redux/State';
// tslint:disable-next-line: import-name
import createStore from '../../src/redux/Store';
import { parsePersistedState } from '../../src/services/StateHydration';
import { ReduxConstants } from '../../src/typings/ReduxConstants';

type GenuineFixtureMetadata = {
  kind: string;
  browserFamily: 'Firefox' | 'Chromium';
  browserVersion: string;
  cadVersion: string;
  os: string;
  upstreamIssue: number;
  sourceUrl: string;
  capturedAt: string;
  sourceForm: string;
  note: string;
};

type GenuineFixture = {
  metadata: GenuineFixtureMetadata;
  state: Partial<State> & Pick<State, 'lists' | 'settings'>;
};

const fixtureDirectory = path.resolve(
  __dirname,
  '../fixtures/genuine-user-state',
);

const fixtures: GenuineFixture[] = fs
  .readdirSync(fixtureDirectory)
  .filter((fileName) => fileName.endsWith('.json'))
  .sort()
  .map(
    (fileName) =>
      JSON.parse(
        fs.readFileSync(path.join(fixtureDirectory, fileName), 'utf8'),
      ) as GenuineFixture,
  );

describe.each(fixtures)(
  'genuine historical user data: $metadata.browserFamily CAD $metadata.cadVersion',
  (fixture) => {
    it('records auditable public-user provenance', () => {
      expect(fixture.metadata.kind).toMatch(
        /^public-upstream-user-(persisted-state|settings-export)$/,
      );
      expect(fixture.metadata.upstreamIssue).toBeGreaterThan(0);
      expect(fixture.metadata.sourceUrl).toBe(
        `https://github.com/Cookie-AutoDelete/Cookie-AutoDelete/issues/${fixture.metadata.upstreamIssue}`,
      );
      expect(fixture.metadata.cadVersion).toMatch(/^\d+\.\d+\.\d+$/);
    });

    it('hydrates and upgrades without destructive reset or silent user-data loss', () => {
      const originalState = JSON.parse(
        JSON.stringify(fixture.state),
      ) as GenuineFixture['state'];
      const originalLists = JSON.parse(
        JSON.stringify(originalState.lists),
      ) as StoreIdToExpressionList;
      const originalSettings = JSON.parse(
        JSON.stringify(originalState.settings),
      ) as MapToSettingObject;

      const parsedState = parsePersistedState({
        state: JSON.stringify(originalState),
      });
      const store = createStore(parsedState);
      const detectedBrowser =
        fixture.metadata.browserFamily === 'Firefox'
          ? browserName.Firefox
          : browserName.Chrome;

      store.dispatch({
        type: ReduxConstants.ADD_CACHE,
        payload: { key: 'browserDetect', value: detectedBrowser },
      });
      store.dispatch({
        type: ReduxConstants.ADD_CACHE,
        payload: { key: 'browserVersion', value: 140 },
      });
      store.dispatch({
        type: ReduxConstants.ADD_CACHE,
        payload: { key: 'platformOs', value: 'linux' },
      });
      store.dispatch(validateSettings());

      const upgraded = store.getState() as State;

      expect(upgraded.lists).toEqual(originalLists);
      expect(upgraded.cookieDeletedCounterTotal).toBe(
        originalState.cookieDeletedCounterTotal || 0,
      );
      expect(upgraded.cookieDeletedCounterSession).toBe(
        originalState.cookieDeletedCounterSession || 0,
      );

      Object.keys(originalSettings).forEach((settingName) => {
        expect(upgraded.settings[settingName].value).toEqual(
          originalSettings[settingName].value,
        );
      });

      expect(Object.keys(upgraded.settings).sort()).toEqual(
        Object.keys(initialState.settings).sort(),
      );

      // Persist the normalized result and hydrate it again. The upgrade must be
      // stable rather than requiring a destructive reset on the next startup.
      const rehydrated = createStore(
        parsePersistedState({ state: JSON.stringify(upgraded) }),
      ).getState() as State;
      expect(rehydrated.lists).toEqual(upgraded.lists);
      expect(rehydrated.settings).toEqual(upgraded.settings);

      if (fixture.metadata.upstreamIssue === 197) {
        expect(upgraded.lists['firefox-container-2']).toEqual([
          {
            expression: '*.mozilla.org',
            storeId: 'firefox-container-2',
            listType: 'WHITE',
            id: 'H1ugOn7pb',
            cookieNames: [],
          },
        ]);
        expect(upgraded.settings[SettingID.CLEAN_DELAY].value).toBe('0.1');
        expect(upgraded.settings[SettingID.CONTEXTUAL_IDENTITIES].value).toBe(
          true,
        );
        expect(upgraded.cache['firefox-container-2']).toBe('Work');
      }

      if (fixture.metadata.upstreamIssue === 1606) {
        expect(upgraded.settings[SettingID.ACTIVE_MODE].value).toBe(true);
        expect(upgraded.settings[SettingID.CLEAN_DELAY].value).toBe(5);
        expect(upgraded.settings[SettingID.CLEAN_EXPIRED].value).toBe(true);
        expect(upgraded.settings[SettingID.CONTEXT_MENUS].value).toBe(true);
        expect(upgraded.settings[SettingID.CONTEXTUAL_IDENTITIES].value).toBe(
          false,
        );
      }
    });
  },
);
