import type { DomainCommand, DomainOperation, DomainState } from '@noura/domain';
import { searchDomain, type SearchResult } from './services/search';

/**
 * Framework-free local REST API (Phase 2 "backend REST API"). Exposes the
 * offline-local surface over standard Request/Response so it can be mounted in
 * a Tauri HTTP capability, a Bun server, or a service worker. All routes are
 * deterministic and do not log user content.
 */

export interface LocalRestApiDeps {
  version?: string;
  getState(): DomainState;
  execute(command: DomainCommand): Promise<DomainOperation>;
  search(query: string): SearchResult[];
  exportBackup(): Promise<unknown>;
  importBackup(input: unknown): Promise<void>;
}

export const json = (status: number, body: unknown): Response =>
  new Response(JSON.stringify(body), {
    status,
    headers: { 'content-type': 'application/json' },
  });

export class LocalRestApi {
  readonly #deps: LocalRestApiDeps;

  constructor(deps: LocalRestApiDeps) {
    this.#deps = deps;
  }

  async handle(request: Request): Promise<Response> {
    const url = new URL(request.url);
    const path = url.pathname.replace(/\/+$/, '') || '/';
    try {
      if (request.method === 'GET' && path === '/api/health') {
        return json(200, { ok: true, version: this.#deps.version ?? '0.1.0' });
      }
      if (request.method === 'GET' && path === '/api/state') {
        return json(200, this.#deps.getState());
      }
      if (request.method === 'POST' && path === '/api/ops') {
        const body = (await request.json()) as { command?: DomainCommand };
        if (!body.command) return json(400, { error: 'command is required' });
        const operation = await this.#deps.execute(body.command);
        return json(200, { operation });
      }
      if (request.method === 'GET' && path === '/api/search') {
        const query = url.searchParams.get('q') ?? '';
        return json(200, { results: this.#deps.search(query) });
      }
      if (request.method === 'GET' && path === '/api/tasks') {
        return json(200, this.#deps.getState().tasks);
      }
      if (request.method === 'GET' && path === '/api/history') {
        return json(200, Object.values(this.#deps.getState().history));
      }
      if (request.method === 'GET' && path === '/api/worklog') {
        return json(
          200,
          Object.values(this.#deps.getState().worklogs).sort(
            (a, b) => a.started - b.started,
          ),
        );
      }
      if (request.method === 'GET' && path === '/api/backup/export') {
        const payload = await this.#deps.exportBackup();
        return json(200, payload);
      }
      if (request.method === 'POST' && path === '/api/backup/import') {
        const body = (await request.json()) as unknown;
        await this.#deps.importBackup(body);
        return json(200, { ok: true });
      }
      return json(404, { error: `no route for ${request.method} ${path}` });
    } catch (error) {
      return json(500, {
        error: error instanceof Error ? error.message : 'unexpected error',
      });
    }
  }
}
