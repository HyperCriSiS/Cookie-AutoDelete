import StatePersistence from '../../src/services/StatePersistence';
import { parsePersistedState } from '../../src/services/StateHydration';

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
    expect(parsePersistedState(stored)).toEqual(state);
  });
});
