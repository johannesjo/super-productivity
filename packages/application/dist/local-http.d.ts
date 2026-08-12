import type { DomainCommand, DomainOperation, DomainState } from '@noura/domain';
import { type SearchResult } from './services/search';
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
export declare const json: (status: number, body: unknown) => Response;
export declare class LocalRestApi {
    #private;
    constructor(deps: LocalRestApiDeps);
    handle(request: Request): Promise<Response>;
}
