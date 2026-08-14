import { expressions } from '../../src/redux/Reducers';
import { ReduxConstants } from '../../src/typings/ReduxConstants';

describe('Expression ID preservation', () => {
  const original: Expression = {
    cookieNames: [],
    cleanSiteData: [],
    expression: 'example.com',
    id: 'stable-id',
    listType: ListType.WHITE,
    storeId: 'default',
  };

  it('keeps an existing ID when an expression is updated', () => {
    const result = expressions([original], {
      type: ReduxConstants.UPDATE_EXPRESSION,
      payload: {
        ...original,
        expression: 'www.example.com',
      },
    } as never);

    expect(result).toHaveLength(1);
    expect(result[0].id).toBe('stable-id');
    expect(result[0].expression).toBe('www.example.com');
  });

  it('keeps an imported ID when an expression is added', () => {
    const result = expressions([], {
      type: ReduxConstants.ADD_EXPRESSION,
      payload: original,
    } as never);

    expect(result).toHaveLength(1);
    expect(result[0].id).toBe('stable-id');
  });
});
