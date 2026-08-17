/**
 * Copyright (c) 2017-2022 Kenny Do and CAD Team
 * (https://github.com/Cookie-AutoDelete/Cookie-AutoDelete/graphs/contributors)
 * Licensed under MIT
 * (https://github.com/Cookie-AutoDelete/Cookie-AutoDelete/blob/3.X.X-Branch/LICENSE)
 *
 * Defensive parsing for persisted extension state. A corrupt stored state must
 * never be silently replaced with an empty state because a later Redux action
 * would then persist that empty state and destroy recoverable user data.
 */

export type PersistedStorage = {
  state?: unknown;
};

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

export const parsePersistedState = (
  storage: PersistedStorage,
): Partial<State> => {
  // No stored state is valid for a fresh installation.
  if (storage.state === undefined) return {};

  if (typeof storage.state !== 'string' || storage.state.length === 0) {
    throw new Error('Persisted Cookie AutoDelete state is not a JSON string.');
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(storage.state);
  } catch (error) {
    throw new Error('Persisted Cookie AutoDelete state contains invalid JSON.');
  }

  if (!isRecord(parsed)) {
    throw new Error('Persisted Cookie AutoDelete state is not an object.');
  }

  // All supported 3.x persisted Redux states contain both core slices. An
  // existing state without them is treated as incomplete/corrupt instead of
  // letting Redux silently recreate empty lists and then persist them.
  if (!Object.prototype.hasOwnProperty.call(parsed, 'lists')) {
    throw new Error('Persisted Cookie AutoDelete state is missing expression lists.');
  }
  if (!Object.prototype.hasOwnProperty.call(parsed, 'settings')) {
    throw new Error('Persisted Cookie AutoDelete state is missing settings.');
  }

  if (!isRecord(parsed.lists)) {
    throw new Error('Persisted Cookie AutoDelete expression lists are invalid.');
  }

  if (!isRecord(parsed.settings)) {
    throw new Error('Persisted Cookie AutoDelete settings are invalid.');
  }

  return parsed as Partial<State>;
};
