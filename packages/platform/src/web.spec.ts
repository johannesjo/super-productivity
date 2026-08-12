import { describe, expect, it } from 'vitest';
import { MemoryCredentials } from './memory-credentials';
import { createWebPlatformPorts } from './web';
import { isTauri } from './index';

describe('MemoryCredentials', () => {
  it('stores, reads, lists and removes values', async () => {
    const credentials = new MemoryCredentials();
    await credentials.set('jira', '{"host":"x"}');
    expect(await credentials.get('jira')).toBe('{"host":"x"}');
    expect(await credentials.keys()).toEqual(['jira']);
    await credentials.remove('jira');
    expect(await credentials.get('jira')).toBeUndefined();
  });
});

describe('createWebPlatformPorts', () => {
  it('routes credentials through the supplied store', async () => {
    const store = new MemoryCredentials();
    const ports = createWebPlatformPorts(store);
    await ports.credentials.set('linear', 'secret');
    expect(await ports.credentials.get('linear')).toBe('secret');
    expect(await store.get('linear')).toBe('secret');
    await ports.credentials.remove('linear');
    expect(await store.get('linear')).toBeUndefined();
  });

  it('provides an HttpPort backed by fetch', async () => {
    let hit = 0;
    const original = globalThis.fetch;
    const fakeFetch = async (): Promise<Response> => {
      hit += 1;
      return new Response('ok');
    };
    globalThis.fetch = fakeFetch as typeof fetch;
    try {
      const ports = createWebPlatformPorts();
      const response = await ports.http.request('https://example.test');
      expect(response.status).toBe(200);
    } finally {
      globalThis.fetch = original;
    }
    expect(hit).toBe(1);
  });

  it('reports tauri detection deterministically', () => {
    expect(typeof isTauri()).toBe('boolean');
  });
});
