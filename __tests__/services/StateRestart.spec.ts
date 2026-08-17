import StatePersistence from '../../src/services/StatePersistence';
import { parsePersistedState } from '../../src/services/StateHydration';
import createStore from '../../src/redux/Store';
import { initialState } from '../../src/redux/State';

describe('persisted state restart restoration', () => {
  it('round-trips persisted allowlist and greylist entries across a service-worker restart', async () => {
    let stored: { state?: string } = {};
    const writer = jest.fn().mockImplementation(async (values) => {
      stored = values;
    });
    const persistence = new StatePersistence(writer);
    const state = {
      lists: {
        default: [
          {
            expression: 'allow.example',
            id: 'allow-1',
            listType: 'WHITE',
            storeId: 'default',
          },
          {
            expression: 'grey.example',
            id: 'grey-1',
            listType: 'GREY',
            storeId: 'default',
          },
        ],
      },
      settings: {},
    };

    persistence.save(state);
    await persistence.whenIdle();

    expect(writer).toHaveBeenCalledTimes(1);
    const restored = parsePersistedState(stored);
    const restartedStore = createStore(restored);
    expect(restartedStore.getState().lists).toEqual(state.lists);
  });

  it('restores cleanup-policy settings before startup behavior is evaluated', async () => {
    let stored: { state?: string } = {};
    const writer = jest.fn().mockImplementation(async (values) => {
      stored = values;
    });
    const persistence = new StatePersistence(writer);
    const state = {
      ...initialState,
      settings: {
        ...initialState.settings,
        [SettingID.ACTIVE_MODE]: {
          ...initialState.settings[SettingID.ACTIVE_MODE],
          value: true,
        },
        [SettingID.ENABLE_GREYLIST]: {
          ...initialState.settings[SettingID.ENABLE_GREYLIST],
          value: true,
        },
        [SettingID.CLEAN_OPEN_TABS_STARTUP]: {
          ...initialState.settings[SettingID.CLEAN_OPEN_TABS_STARTUP],
          value: true,
        },
      },
    };

    persistence.save(state);
    await persistence.whenIdle();

    const restartedStore = createStore(parsePersistedState(stored));
    expect(restartedStore.getState().settings[SettingID.ACTIVE_MODE].value).toBe(true);
    expect(restartedStore.getState().settings[SettingID.ENABLE_GREYLIST].value).toBe(true);
    expect(
      restartedStore.getState().settings[SettingID.CLEAN_OPEN_TABS_STARTUP].value,
    ).toBe(true);
  });
});
