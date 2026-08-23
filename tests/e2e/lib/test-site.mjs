import http from 'node:http';

const ORIGIN_HOSTS = Object.freeze({
  a: '127.0.0.1',
  b: '127.0.0.2',
});

const html = `<!doctype html>
<html>
<head><meta charset="utf-8"><title>Cookie AutoDelete E2E site</title></head>
<body>
<h1>Cookie AutoDelete E2E site</h1>
<script>
(() => {
  const DB_NAME = 'cad-e2e-db';
  const STORE_NAME = 'records';
  const STORAGE_KEY = 'cad-e2e-local';
  const COOKIE_NAME = 'cad_e2e_cookie';

  const openDb = () => new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, 1);
    request.onupgradeneeded = () => {
      if (!request.result.objectStoreNames.contains(STORE_NAME)) {
        request.result.createObjectStore(STORE_NAME);
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });

  const hasDb = async () => {
    if (typeof indexedDB.databases !== 'function') return null;
    const databases = await indexedDB.databases();
    return databases.some((db) => db.name === DB_NAME);
  };

  const inspect = async () => {
    const registrations = await navigator.serviceWorker.getRegistrations();
    return {
      cookie: document.cookie.split(';').map((v) => v.trim()).some((v) => v.startsWith(COOKIE_NAME + '=')),
      localStorage: localStorage.getItem(STORAGE_KEY),
      indexedDB: await hasDb(),
      serviceWorker: registrations.some((registration) => registration.scope.startsWith(location.origin + '/')),
    };
  };

  const fetchCache = async (token) => {
    const response = await fetch('/cad-e2e-cacheable?key=' + encodeURIComponent(token), { cache: 'force-cache' });
    return response.text();
  };

  const seed = async (token) => {
    document.cookie = COOKIE_NAME + '=' + encodeURIComponent(token) + '; Path=/; SameSite=Lax';
    localStorage.setItem(STORAGE_KEY, token);

    const db = await openDb();
    await new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readwrite');
      tx.objectStore(STORE_NAME).put(token, 'token');
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
    db.close();

    await navigator.serviceWorker.register('/cad-e2e-sw.js?token=' + encodeURIComponent(token), { scope: '/' });
    await navigator.serviceWorker.ready;

    await fetchCache(token);
    await fetchCache(token);
    return inspect();
  };

  const clear = async () => {
    document.cookie = COOKIE_NAME + '=; Path=/; Max-Age=0; SameSite=Lax';
    localStorage.removeItem(STORAGE_KEY);
    await new Promise((resolve) => {
      const request = indexedDB.deleteDatabase(DB_NAME);
      request.onsuccess = () => resolve();
      request.onerror = () => resolve();
      request.onblocked = () => resolve();
    });
    const registrations = await navigator.serviceWorker.getRegistrations();
    await Promise.all(registrations.map((registration) => registration.unregister()));
    return inspect();
  };

  window.cadE2E = { seed, inspect, clear, fetchCache };
})();
</script>
</body>
</html>`;

const sw = `self.addEventListener('install', () => self.skipWaiting());\nself.addEventListener('activate', (event) => event.waitUntil(self.clients.claim()));\n`;

export const startTestSite = async ({ port = Number(process.env.CAD_E2E_PORT || 80) } = {}) => {
  const cacheHits = new Map();

  const server = http.createServer((request, response) => {
    const url = new URL(request.url || '/', 'http://127.0.0.1');
    if (url.pathname === '/cad-e2e-sw.js') {
      response.writeHead(200, {
        'Cache-Control': 'no-store',
        'Content-Type': 'application/javascript; charset=utf-8',
        'Service-Worker-Allowed': '/',
      });
      response.end(sw);
      return;
    }

    if (url.pathname === '/cad-e2e-cacheable') {
      const key = url.searchParams.get('key') || 'default';
      cacheHits.set(key, (cacheHits.get(key) || 0) + 1);
      response.writeHead(200, {
        'Cache-Control': 'public, max-age=3600, immutable',
        'Content-Type': 'text/plain; charset=utf-8',
      });
      response.end('cacheable:' + key);
      return;
    }

    response.writeHead(200, {
      'Cache-Control': 'no-store',
      'Content-Type': 'text/html; charset=utf-8',
    });
    response.end(html);
  });

  await new Promise((resolve, reject) => {
    server.once('error', reject);
    server.listen(port, '0.0.0.0', resolve);
  }).catch((error) => {
    if (error && error.code === 'EACCES' && port < 1024) {
      throw new Error(
        `Cannot bind the E2E test site to port ${port}. The full Chromium site-data test needs the default HTTP port because Cookie AutoDelete only has the cookie hostname when constructing browsingData origins. Grant the Node binary CAP_NET_BIND_SERVICE or run the CI workflow.`,
      );
    }
    throw error;
  });

  return {
    origin(name = 'a') {
      const host = ORIGIN_HOSTS[name];
      if (!host) throw new Error(`Unknown E2E origin: ${name}`);
      return `http://${host}${port === 80 ? '' : `:${port}`}`;
    },
    hits(key) {
      return cacheHits.get(key) || 0;
    },
    resetHits(key) {
      cacheHits.delete(key);
    },
    async close() {
      await new Promise((resolve) => server.close(resolve));
    },
  };
};
