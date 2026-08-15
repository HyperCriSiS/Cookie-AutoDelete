import {
  createExpressionBackup,
  EXPRESSION_BACKUP_FORMAT,
  EXPRESSION_BACKUP_VERSION,
  parseExpressionBackup,
} from '../../src/services/ExpressionBackupService';

const lists: StoreIdToExpressionList = {
  default: [
    {
      expression: 'example.com',
      id: 'default-rule',
      listType: ListType.WHITE,
      storeId: 'default',
    },
  ],
  'firefox-container-24': [
    {
      expression: 'games.example',
      id: 'games-rule',
      listType: ListType.GREY,
      storeId: 'firefox-container-24',
    },
  ],
};

describe('ExpressionBackupService', () => {
  it('creates a versioned backup without rewriting list store IDs', () => {
    const backup = createExpressionBackup(
      lists,
      [
        {
          storeId: 'firefox-container-24',
          name: 'Games',
          color: 'blue',
          icon: 'briefcase',
        },
      ],
      new Date('2026-08-15T00:00:00.000Z'),
    );

    expect(backup).toEqual({
      format: EXPRESSION_BACKUP_FORMAT,
      version: EXPRESSION_BACKUP_VERSION,
      exportedAt: '2026-08-15T00:00:00.000Z',
      lists,
      containers: [
        {
          storeId: 'firefox-container-24',
          name: 'Games',
          color: 'blue',
          icon: 'briefcase',
        },
      ],
    });
  });

  it('preserves duplicate container names as separate mapping candidates', () => {
    const backup = createExpressionBackup(lists, [
      { storeId: 'firefox-container-24', name: 'Games' },
      { storeId: 'firefox-container-31', name: 'Games' },
    ]);

    expect(backup.containers).toHaveLength(2);
    expect(backup.containers[0].storeId).not.toBe(backup.containers[1].storeId);
    expect(backup.containers[0].name).toBe(backup.containers[1].name);
  });

  it('parses the versioned format with container metadata', () => {
    const backup = createExpressionBackup(lists, [
      { storeId: 'firefox-container-24', name: 'Games' },
    ]);

    expect(parseExpressionBackup(backup)).toEqual({
      version: 2,
      legacy: false,
      lists,
      containers: [{ storeId: 'firefox-container-24', name: 'Games' }],
    });
  });

  it('keeps legacy raw-list exports readable', () => {
    expect(parseExpressionBackup(lists)).toEqual({
      version: 1,
      legacy: true,
      lists,
      containers: [],
    });
  });

  it('rejects unsupported versions and invalid backup structures', () => {
    expect(() =>
      parseExpressionBackup({
        format: EXPRESSION_BACKUP_FORMAT,
        version: 99,
        lists,
        containers: [],
      }),
    ).toThrow('Unsupported expression backup version');

    expect(() => parseExpressionBackup({ default: {} })).toThrow(
      'Legacy expression backup contains invalid lists',
    );

    expect(() =>
      parseExpressionBackup({
        format: EXPRESSION_BACKUP_FORMAT,
        version: EXPRESSION_BACKUP_VERSION,
        lists,
        containers: [{ storeId: '', name: 'Invalid' }],
      }),
    ).toThrow('invalid container metadata');
  });
});
