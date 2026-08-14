import { initialState } from '../../src/redux/State';
import {
  otherBrowsingDataCleanup,
  removeSiteData,
} from '../../src/services/CleanupService';

const withEnabledSetting = (
  setting: SettingID,
  cache: CacheMap,
): State =>
  ({
    ...initialState,
    cache: {
      ...initialState.cache,
      ...cache,
    },
    settings: {
      ...initialState.settings,
      [setting]: {
        ...initialState.settings[setting],
        value: true,
      },
    },
  } as State);

describe('Cleanup browser capability regressions', () => {
  beforeEach(() => {
    global.browser.browsingData.remove.mockResolvedValue(undefined as never);
  });

  it('allows modern Firefox Android through automatic site-data cleanup gates', async () => {
    const state = withEnabledSetting(SettingID.CLEANUP_CACHE, {
      browserDetect: browserName.Firefox,
      browserVersion: '115.0',
      platformOs: 'android',
    });

    await expect(otherBrowsingDataCleanup(state, [])).resolves.toEqual({
      [SiteDataType.CACHE]: [],
    });
  });

  it.each([browserName.EdgeChromium, browserName.Opera])(
    'uses origins for targeted browsing-data removal in %s',
    async (name) => {
      await removeSiteData(
        initialState,
        SiteDataType.CACHE,
        name,
        ['https://example.com'],
        false,
      );

      expect(global.browser.browsingData.remove).toHaveBeenCalledWith(
        { origins: ['https://example.com'] },
        { cache: true },
      );
    },
  );
});
