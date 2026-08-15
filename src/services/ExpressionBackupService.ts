/**
 * Copyright (c) 2017-2022 Kenny Do and CAD Team
 * (https://github.com/Cookie-AutoDelete/Cookie-AutoDelete/graphs/contributors)
 * Licensed under MIT
 * (https://github.com/Cookie-AutoDelete/Cookie-AutoDelete/blob/3.X.X-Branch/LICENSE)
 *
 * Versioned expression-backup format. Legacy exports are raw
 * StoreIdToExpressionList objects; version 2 keeps those lists unchanged and
 * adds descriptive Firefox-container metadata for a later explicit import
 * mapping UI. Container names are intentionally not treated as unique IDs.
 */

export const EXPRESSION_BACKUP_FORMAT = 'cookie-autodelete-expressions';
export const EXPRESSION_BACKUP_VERSION = 2;

export type ExpressionContainerMetadata = Readonly<{
  storeId: string;
  name: string;
  color?: string;
  icon?: string;
}>;

export type ContextualIdentityMetadataSource = Readonly<{
  cookieStoreId: string;
  name: string;
  color?: string;
  icon?: string;
}>;

export type ExpressionBackupV2 = Readonly<{
  format: typeof EXPRESSION_BACKUP_FORMAT;
  version: typeof EXPRESSION_BACKUP_VERSION;
  exportedAt: string;
  lists: StoreIdToExpressionList;
  containers: ExpressionContainerMetadata[];
}>;

export type ContainerImportMapping = Readonly<{
  source: ExpressionContainerMetadata;
  status: 'exact-id' | 'needs-confirmation' | 'missing';
  candidateStoreIds: string[];
}>;

export type ParsedExpressionBackup = Readonly<{
  version: 1 | typeof EXPRESSION_BACKUP_VERSION;
  legacy: boolean;
  lists: StoreIdToExpressionList;
  containers: ExpressionContainerMetadata[];
}>;

type RecordValue = Record<string, unknown>;

const isRecord = (value: unknown): value is RecordValue =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

const isExpressionLists = (value: unknown): value is StoreIdToExpressionList => {
  if (!isRecord(value)) return false;
  return Object.values(value).every((list) => Array.isArray(list));
};

const isContainerMetadata = (
  value: unknown,
): value is ExpressionContainerMetadata => {
  if (!isRecord(value)) return false;
  if (typeof value.storeId !== 'string' || value.storeId.length === 0) {
    return false;
  }
  if (typeof value.name !== 'string') return false;
  if (value.color !== undefined && typeof value.color !== 'string') return false;
  if (value.icon !== undefined && typeof value.icon !== 'string') return false;
  return true;
};

export const containerMetadataFromIdentities = (
  identities: ContextualIdentityMetadataSource[],
): ExpressionContainerMetadata[] =>
  identities.map((identity) => ({
    storeId: identity.cookieStoreId,
    name: identity.name,
    ...(identity.color === undefined ? {} : { color: identity.color }),
    ...(identity.icon === undefined ? {} : { icon: identity.icon }),
  }));

export const createExpressionBackup = (
  lists: StoreIdToExpressionList,
  containers: ExpressionContainerMetadata[] = [],
  exportedAt = new Date(),
): ExpressionBackupV2 => ({
  format: EXPRESSION_BACKUP_FORMAT,
  version: EXPRESSION_BACKUP_VERSION,
  exportedAt: exportedAt.toISOString(),
  lists,
  containers: [...containers],
});

export const parseExpressionBackup = (
  value: unknown,
): ParsedExpressionBackup => {
  if (!isRecord(value)) {
    throw new Error('Expression backup must be a JSON object.');
  }

  if (value.format === EXPRESSION_BACKUP_FORMAT) {
    if (value.version !== EXPRESSION_BACKUP_VERSION) {
      throw new Error(`Unsupported expression backup version: ${value.version}`);
    }
    if (!isExpressionLists(value.lists)) {
      throw new Error('Expression backup contains invalid lists.');
    }
    if (
      !Array.isArray(value.containers) ||
      !value.containers.every(isContainerMetadata)
    ) {
      throw new Error('Expression backup contains invalid container metadata.');
    }

    return {
      version: EXPRESSION_BACKUP_VERSION,
      legacy: false,
      lists: value.lists,
      containers: [...value.containers],
    };
  }

  // Cookie AutoDelete 3.x exported the lists object directly. Continue reading
  // that format so users do not have to migrate old backup files first.
  if (!isExpressionLists(value)) {
    throw new Error('Legacy expression backup contains invalid lists.');
  }

  return {
    version: 1,
    legacy: true,
    lists: value,
    containers: [],
  };
};

export const buildContainerImportPlan = (
  sourceContainers: ExpressionContainerMetadata[],
  currentContainers: ExpressionContainerMetadata[],
): ContainerImportMapping[] =>
  sourceContainers.map((source) => {
    const exact = currentContainers.find(
      (candidate) => candidate.storeId === source.storeId,
    );
    if (exact && exact.name === source.name) {
      return {
        source,
        status: 'exact-id',
        candidateStoreIds: [exact.storeId],
      };
    }

    const sameName = currentContainers
      .filter((candidate) => candidate.name === source.name)
      .map((candidate) => candidate.storeId);
    const candidates = exact
      ? [exact.storeId, ...sameName.filter((storeId) => storeId !== exact.storeId)]
      : sameName;

    if (candidates.length > 0) {
      return {
        source,
        status: 'needs-confirmation',
        candidateStoreIds: candidates,
      };
    }

    return {
      source,
      status: 'missing',
      candidateStoreIds: [],
    };
  });
