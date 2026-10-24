/**
 * Copyright (c) 2017-2022 Kenny Do and CAD Team
 * (https://github.com/Cookie-AutoDelete/Cookie-AutoDelete/graphs/contributors)
 * Licensed under MIT
 * (https://github.com/Cookie-AutoDelete/Cookie-AutoDelete/blob/3.X.X-Branch/LICENSE)
 *
 * Persist extension state without relying on timers that can be interrupted by
 * an MV3 service-worker shutdown. Writes are serialized and rapid updates are
 * coalesced to the newest snapshot while a previous storage write is active.
 */

export type StateStorageWriter = (values: {
  state: string;
}) => Promise<void>;

export type PersistenceErrorHandler = (error: unknown) => void;

export default class StatePersistence {
  constructor(
    private readonly writer: StateStorageWriter = (values) =>
      browser.storage.local.set(values),
    private readonly onError: PersistenceErrorHandler = () => undefined,
  ) {}

  public save(state: unknown): void {
    this.pendingState = JSON.stringify(state);
    if (!this.running) {
      this.running = this.flush();
    }
  }

  /**
   * Exposed primarily for tests and orderly shutdown paths. Normal callers only
   * need save(); it starts persistence immediately.
   */
  public whenIdle(): Promise<void> {
    return this.running || Promise.resolve();
  }

  private async flush(): Promise<void> {
    while (this.pendingState !== undefined) {
      const snapshot = this.pendingState;
      this.pendingState = undefined;

      try {
        await this.writer({ state: snapshot });
      } catch (error) {
        this.onError(error);
      }
    }

    this.running = undefined;
  }

  private pendingState: string | undefined;
  private running: Promise<void> | undefined;
}
