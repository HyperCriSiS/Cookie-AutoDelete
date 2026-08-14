/**
 * Copyright (c) 2017-2022 Kenny Do and CAD Team
 * (https://github.com/Cookie-AutoDelete/Cookie-AutoDelete/graphs/contributors)
 * Licensed under MIT
 * (https://github.com/Cookie-AutoDelete/Cookie-AutoDelete/blob/3.X.X-Branch/LICENSE)
 *
 * Local ID generation for expression IDs, notification IDs and temporary
 * internal-cookie paths. The default export intentionally exposes generate()
 * so existing shortid imports can be redirected here during the staged
 * dependency migration without changing persisted IDs.
 */

type CryptoWithRandomUUID = Crypto & {
  randomUUID?: () => string;
};

const bytesToUuid = (bytes: Uint8Array): string => {
  // RFC 4122 version 4 + variant bits.
  bytes[6] = (bytes[6] & 0x0f) | 0x40;
  bytes[8] = (bytes[8] & 0x3f) | 0x80;

  const hex = Array.from(bytes, (byte) => byte.toString(16).padStart(2, '0'));
  return `${hex.slice(0, 4).join('')}-${hex.slice(4, 6).join('')}-${hex
    .slice(6, 8)
    .join('')}-${hex.slice(8, 10).join('')}-${hex.slice(10, 16).join('')}`;
};

export const generateId = (): string => {
  const cryptoApi = globalThis.crypto as CryptoWithRandomUUID | undefined;

  if (cryptoApi?.randomUUID) {
    return cryptoApi.randomUUID();
  }

  if (cryptoApi?.getRandomValues) {
    return bytesToUuid(cryptoApi.getRandomValues(new Uint8Array(16)));
  }

  // Supported production browsers expose Web Crypto. Keep a final fallback for
  // unusual test/tooling runtimes so ID generation never crashes build tools.
  const random = Math.random().toString(36).slice(2);
  return `${Date.now().toString(36)}-${random}`;
};

export default {
  generate: generateId,
};
