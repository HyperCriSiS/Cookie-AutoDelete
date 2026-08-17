import { generateId } from '../../src/services/IdService';

describe('IdService', () => {
  it('returns non-empty unique IDs', () => {
    const first = generateId();
    const second = generateId();

    expect(first).toEqual(expect.any(String));
    expect(first.length).toBeGreaterThan(8);
    expect(second).not.toBe(first);
  });
});
