import {
  buildContainerImportPlan,
  containerMetadataFromIdentities,
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
  it('extracts stable descriptive fields from Firefox contextual identities', () => {
    expect(
      containerMetadataFromIdentities([
        {
          cookieStoreId: 'firefox-container-24',
          name: 'Games',
          color: 'blue',
          icon: 'briefcase',
        },
      ]),
    ).toEqual([
      {
        storeId: 'firefox-container-24',
        name: 'Games',
        color: 'blue',
        icon: 'briefcase',
      },
    ]);
  });

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

  it('requires confirmation for name-only container matches', () => {
    expect(
      buildContainerImportPlan(
        [{ storeId: 'firefox-container-24', name: 'Games' }],
        [{ storeId: 'firefox-container-11', name: 'Games' }],
      ),
    ).toEqual([
      {
        source: { storeId: 'firefox-container-24', name: 'Games' },
        status: 'needs-confirmation',
        candidateStoreIds: ['firefox-container-11'],
      },
    ]);
  });

  it('keeps duplicate-name mapping candidates explicit', () => {
    expect(
      buildContainerImportPlan(
        [{ storeId: 'firefox-container-24', name: 'Games' }],
        [
          { storeId: 'firefox-container-11', name: 'Games' },
          { storeId: 'firefox-container-31', name: 'Games' },
        ],
      )[0],
    ).toEqual({
      source: { storeId: 'firefox-container-24', name: 'Games' },
      status: 'needs-confirmation',
      candidateStoreIds: ['firefox-container-11', 'firefox-container-31'],
    });
  });

  it('accepts matching store ID and name as an exact candidate', () => {
    expect(
      buildContainerImportPlan(
        [{ storeId: 'firefox-container-24', name: 'Games' }],
        [{ storeId: 'firefox-container-24', name: 'Games' }],
      )[0],
    ).toEqual({
      source: { storeId: 'firefox-container-24', name: 'Games' },
      status: 'exact-id',
      candidateStoreIds: ['firefox-container-24'],
    });
  });

  it('requires confirmation when an exact store ID now has a different name', () => {
    expect(
      buildContainerImportPlan(
        [{ storeId: 'firefox-container-24', name: 'Games' }],
        [{ storeId: 'firefox-container-24', name: 'Work' }],
      )[0],
    ).toEqual({
      source: { storeId: 'firefox-container-24', name: 'Games' },
      status: 'needs-confirmation',
      candidateStoreIds: ['firefox-container-24'],
    });
  });

  it('marks containers without candidates as missing', () => {
    expect(
      buildContainerImportPlan(
        [{ storeId: 'firefox-container-24', name: 'Games' }],
        [{ storeId: 'firefox-container-11', name: 'Work' }],
      )[0].status,
    ).toBe('missing');
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
