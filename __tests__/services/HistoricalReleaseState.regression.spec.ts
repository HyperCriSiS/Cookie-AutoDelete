/**
 * Upgrade coverage backed by real historical upstream release schemas.
 *
 * These fixtures are exact initialState shapes from tagged Cookie AutoDelete
 * releases. They are deliberately distinct from the synthetic migration tests:
 * the old schemas come from released source, while user values are overlaid in
 * memory so we can verify that normalization does not destroy them.
 */

import fs from 'fs';
import path from 'path';
import { browserName, ListType, SettingID } from '../../src/typings/Enums';
import { validateSettings } from '../../src/redux/Actions';
import { initialState } from '../../src/redux/State';
// tslint:disable-next-line: import-name
import createStore from '../../src/redux/Store';
import { parsePersistedState } from '../../src/services/StateHydration';
import { ReduxConstants } from '../../src/typings/ReduxConstants';

type FixtureMetadata = {
  kind: string;
  version: string;
  tag: string;
  upstreamCommit: string;
  sourcePath: string;
  sourceBlobSha: string;
  note: string;
};

type HistoricalFixture = {
  metadata: FixtureMetadata;
  state: State;
};

const fixtureDirectory = path.resolve(
  __dirname,
  '../fixtures/historical-state',
);

const fixtures: Array<[string, HistoricalFixture]> = fs
  .readdirSync(fixtureDirectory)
  .filter((fileName) => fileName.endsWith('.json'))
  .sort()
  .map((fileName) => {
    const fixture = JSON.parse(
      fs.readFileSync(path.join(fixtureDirectory, fileName), 'utf8'),
    ) as HistoricalFixture;
    return [fixture.metadata.version, fixture];
  });

describe.each(fixtures)(
  'historical upstream release state %s',
  (_version, fixture) => {
    it('records auditable upstream provenance', () => {
      expect(fixture.metadata.kind).toBe('upstream-release-initial-state');
      expect(fixture.metadata.upstreamCommit).toMatch(/^[0-9a-f]{40}$/);
      expect(fixture.metadata.sourceBlobSha).toMatch(/^[0-9a-f]{40}$/);
      expect(fixture.metadata.sourcePath).toBe('src/redux/State.ts');
    });

    it.each([
      ['Firefox', browserName.Firefox],
      ['Chromium', browserName.Chrome],
    ])(
      'hydrates and upgrades without losing persisted user data in %s',
      (_browserLabel, detectedBrowser) => {
        const legacyState = JSON.parse(
          JSON.stringify(fixture.state),
        ) as State;

        // Overlay representative user data on the exact historical release
        // schema. These keys exist in every fixture version in this directory.
        legacyState.settings[SettingID.CLEAN_DELAY] = {
          ...legacyState.settings[SettingID.CLEAN_DELAY],
          value: 73,
        };
        legacyState.settings[SettingID.NOTIFY_AUTO] = {
          ...legacyState.settings[SettingID.NOTIFY_AUTO],
          value: false,
        };
        legacyState.settings[SettingID.STAT_LOGGING] = {
          ...legacyState.settings[SettingID.STAT_LOGGING],
          value: false,
        };
        legacyState.cookieDeletedCounterTotal = 41;
        legacyState.cookieDeletedCounterSession = 7;
        legacyState.lists = {
          default: [
            {
              expression: `upgrade-${fixture.metadata.version}.example`,
              id: `legacy-${fixture.metadata.version}`,
              listType: ListType.WHITE,
              storeId: 'default',
            },
          ],
        };

        const originalLegacySettings = JSON.parse(
          JSON.stringify(legacyState.settings),
        ) as MapToSettingObject;
        const originalLists = JSON.parse(
          JSON.stringify(legacyState.lists),
        ) as StoreIdToExpressionList;

        const parsedState = parsePersistedState({
          state: JSON.stringify(legacyState),
        });
        const store = createStore(parsedState);

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
        expect(upgraded.cookieDeletedCounterTotal).toBe(41);
        expect(upgraded.cookieDeletedCounterSession).toBe(7);

        // Every setting present in the historical release must retain the user
        // value it had before normalization.
        Object.keys(originalLegacySettings).forEach((settingName) => {
          expect(upgraded.settings[settingName].value).toEqual(
            originalLegacySettings[settingName].value,
          );
        });

        // All settings introduced after the historical release are populated
        // from current defaults instead of causing a destructive reset.
        expect(Object.keys(upgraded.settings).sort()).toEqual(
          Object.keys(initialState.settings).sort(),
        );
        expect(upgraded.settings[SettingID.CLEAN_DELAY].value).toBe(73);
        expect(upgraded.settings[SettingID.NOTIFY_AUTO].value).toBe(false);
        expect(upgraded.settings[SettingID.STAT_LOGGING].value).toBe(false);

        if (fixture.metadata.version === '3.0.2') {
          // 3.0.2 stored numeric setting IDs. The modern setting shape should
          // be restored while retaining the persisted user value.
          expect(upgraded.settings[SettingID.CLEAN_DELAY]).toEqual({
            ...initialState.settings[SettingID.CLEAN_DELAY],
            value: 73,
          });
        }
      },
    );
  },
);
