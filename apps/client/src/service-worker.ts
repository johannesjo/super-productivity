/// <reference lib="webworker" />

import { build, files, version } from '$service-worker';

const worker = self as unknown as ServiceWorkerGlobalScope;
const cacheName = `noura-${version}`;
const assets = [...build, ...files];

worker.addEventListener('install', (event) => {
	event.waitUntil(
		caches.open(cacheName).then(async (cache) => {
			await cache.addAll(assets);
			// The app shell document is not part of `build`/`files`; cache it so
			// offline navigations can always be served.
			await cache.add('/index.html');
			await cache.add('/');
		})
	);
});

worker.addEventListener('activate', (event) => {
	event.waitUntil(
		caches
			.keys()
			.then((keys) =>
				Promise.all(keys.filter((key) => key !== cacheName).map((key) => caches.delete(key)))
			)
	);
});

worker.addEventListener('fetch', (event) => {
	if (event.request.method !== 'GET') return;
	// Navigations fall back to the cached shell (index.html) so the offline
	// reload of any route keeps working after a cache-first miss.
	if (event.request.mode === 'navigate') {
		event.respondWith(
			(async () => {
				const fromRequest = await caches.match(event.request);
				if (fromRequest) return fromRequest;
				const shell = await caches.match('/index.html');
				if (shell) return shell;
				return fetch(event.request);
			})()
		);
		return;
	}
	event.respondWith(
		caches
			.match(event.request)
			.then((cached) => cached ?? fetch(event.request).catch(() => caches.match('/')))
	);
});
