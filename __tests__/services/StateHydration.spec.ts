import { parsePersistedState } from '../../src/services/StateHydration';

describe('StateHydration', () => {
  it('accepts missing state for a fresh installation', () => {
    expect(parsePersistedState({})).toEqual({});
  });

  it('parses a valid persisted state', () => {
    const state = {
      lists: {
        default: [
          {
            expression: 'example.com',
            id: '1',
            listType: ListType.WHITE,
            storeId: 'default',
          },
        ],
      },
      settings: {},
    };

    expect(parsePersistedState({ state: JSON.stringify(state) })).toEqual(
      state,
    );
  });

  it('rejects invalid JSON instead of falling back to an empty state', () => {
    expect(() => parsePersistedState({ state: '{invalid' })).toThrow(
      'invalid JSON',
    );
  });

  it('rejects non-object persisted state', () => {
    expect(() => parsePersistedState({ state: 'null' })).toThrow(
      'not an object',
    );
    expect(() => parsePersistedState({ state: '[]' })).toThrow(
      'not an object',
    );
  });

  it('rejects an existing state that is missing a core slice', () => {
    expect(() => parsePersistedState({ state: '{}' })).toThrow(
      'missing expression lists',
    );

    expect(() =>
      parsePersistedState({ state: JSON.stringify({ lists: {} }) }),
    ).toThrow('missing settings');
  });

  it('rejects invalid expression-list and settings structures', () => {
    expect(() =>
      parsePersistedState({
        state: JSON.stringify({ lists: [], settings: {} }),
      }),
    ).toThrow('expression lists are invalid');

    expect(() =>
      parsePersistedState({
        state: JSON.stringify({ lists: {}, settings: [] }),
      }),
    ).toThrow('settings are invalid');
  });
});
