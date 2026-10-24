/**
 * Copyright (c) 2017-2022 Kenny Do and CAD Team
 * (https://github.com/Cookie-AutoDelete/Cookie-AutoDelete/graphs/contributors)
 * Licensed under MIT
 * (https://github.com/Cookie-AutoDelete/Cookie-AutoDelete/blob/3.X.X-Branch/LICENSE)
 *
 * Small Redux-compatible UI store backed by the extension runtime bridge.
 * It replaces redux-webext on popup/settings without changing the reducers or
 * the component-level dispatch API.
 */

import {
  STORE_CONNECTION_NAME,
  STORE_DISPATCH,
  STORE_UPDATE_STATE,
} from './StoreProtocol';

type StoreUpdateMessage = {
  type?: string;
  data?: State;
};

class UIStore {
  public static async create(): Promise<UIStore> {
    const store = new UIStore();
    store.connect();
    await store.refreshState();
    return store;
  }

  public getState = (): State => {
    if (!this.state) {
      throw new Error('Cookie AutoDelete UI store is not initialized.');
    }
    return this.state;
  };

  public dispatch = (action: any): any => {
    void browser.runtime
      .sendMessage({ type: STORE_DISPATCH, action })
      .catch((error) => {
        console.error('Could not dispatch UI action to background store.', error);
      });
    return action;
  };

  public subscribe = (listener: () => void): (() => void) => {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  };

  private connect(): void {
    try {
      const connection = browser.runtime.connect({
        name: STORE_CONNECTION_NAME,
      });
      this.connection = connection;
      connection.onMessage.addListener((message: StoreUpdateMessage) => {
        if (message.type !== STORE_UPDATE_STATE || !message.data) return;
        this.setState(message.data);
      });
      connection.onDisconnect.addListener(() => {
        if (this.connection === connection) {
          this.connection = undefined;
        }
        this.scheduleReconnect();
      });
    } catch (error) {
      console.error('Could not connect UI store to background worker.', error);
      this.scheduleReconnect();
    }
  }

  private async refreshState(): Promise<void> {
    const state = (await browser.runtime.sendMessage({
      type: STORE_UPDATE_STATE,
    })) as State | undefined;
    if (!state) {
      throw new Error('Background store did not provide an initial state.');
    }
    this.setState(state);
  }

  private setState(state: State): void {
    this.state = state;
    this.listeners.forEach((listener) => listener());
  }

  private scheduleReconnect(): void {
    if (this.reconnectTimer !== undefined) return;
    this.reconnectTimer = globalThis.setTimeout(() => {
      this.reconnectTimer = undefined;
      this.connect();
      void this.refreshState().catch((error) => {
        console.error('Could not refresh UI store after reconnect.', error);
        this.scheduleReconnect();
      });
    }, 250) as unknown as number;
  }

  private connection: browser.runtime.Port | undefined;
  private listeners = new Set<() => void>();
  private reconnectTimer: number | undefined;
  private state: State | undefined;
}

export default async function createUIStore(): Promise<any> {
  return UIStore.create();
}
