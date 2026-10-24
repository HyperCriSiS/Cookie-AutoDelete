/**
 * Copyright (c) 2026 CAD Team
 * Licensed under MIT (https://github.com/Cookie-AutoDelete/Cookie-AutoDelete/blob/3.X.X-Branch/LICENSE)
 */

import { initialState } from '../../src/redux/State';
import {
  getStoreId,
  isTemporaryContainerName,
  TEMPORARY_CONTAINER_STORE_ID,
} from '../../src/services/Libs';
import { browserName, SettingID } from '../../src/typings/Enums';

const firefoxContainerState = (containerName: string): State => ({
  ...initialState,
  cache: {
    ...initialState.cache,
    browserDetect: browserName.Firefox,
    'firefox-container-42': containerName,
  },
  settings: {
    ...initialState.settings,
    [SettingID.CONTEXTUAL_IDENTITIES]: {
      ...initialState.settings[SettingID.CONTEXTUAL_IDENTITIES],
      value: true,
    },
  },
});

describe('Temporary Container rule grouping', () => {
  it('recognizes Temporary Containers by their %tmp name prefix', () => {
    expect(isTemporaryContainerName('%tmp42')).toBe(true);
    expect(isTemporaryContainerName('%TMP-session')).toBe(true);
    expect(isTemporaryContainerName('  %tmp-work  ')).toBe(true);
    expect(isTemporaryContainerName('Work')).toBe(false);
  });

  it('maps every %tmp contextual identity to the shared expression store', () => {
    expect(getStoreId(firefoxContainerState('%tmp42'), 'firefox-container-42')).toBe(
      TEMPORARY_CONTAINER_STORE_ID,
    );
    expect(
      getStoreId(firefoxContainerState('%tmp-session'), 'firefox-container-42'),
    ).toBe(TEMPORARY_CONTAINER_STORE_ID);
  });

  it('keeps ordinary Firefox containers in their concrete store', () => {
    expect(getStoreId(firefoxContainerState('Work'), 'firefox-container-42')).toBe(
      'firefox-container-42',
    );
  });
});
