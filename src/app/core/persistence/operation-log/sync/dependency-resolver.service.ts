import { Injectable, inject } from '@angular/core';
import { Operation, EntityType, extractActionPayload } from '../operation.types';
import { Store } from '@ngrx/store';
import { firstValueFrom } from 'rxjs';
import { Dictionary } from '@ngrx/entity';
import { getEntityConfig, isAdapterEntity, EntityDependency } from '../entity-registry';

export interface OperationDependency {
  entityType: EntityType;
  entityId: string;
  mustExist: boolean;
  relation: 'parent' | 'reference';
}

@Injectable({ providedIn: 'root' })
export class DependencyResolverService {
  private store = inject(Store);

  /**
   * Identifies dependencies for a given operation using the entity registry.
   */
  extractDependencies(op: Operation): OperationDependency[] {
    const config = getEntityConfig(op.entityType);
    if (!config || !config.dependencies?.length) {
      return [];
    }

    const deps: OperationDependency[] = [];
    const actionPayload = extractActionPayload(op.payload);

    for (const depConfig of config.dependencies) {
      const ids = this.extractIdsFromPayload(actionPayload, depConfig, op.entityType);
      for (const id of ids) {
        deps.push({
          entityType: depConfig.dependsOn,
          entityId: id,
          mustExist: depConfig.isHard,
          relation: depConfig.relation,
        });
      }
    }

    return deps;
  }

  /**
   * Checks if dependencies are met in the current store state.
   * Uses bulk entity lookups to avoid N+1 selector subscriptions.
   */
  async checkDependencies(deps: OperationDependency[]): Promise<{
    missing: OperationDependency[];
  }> {
    if (deps.length === 0) {
      return { missing: [] };
    }

    // Group dependencies by entity type
    const depsByType = new Map<EntityType, OperationDependency[]>();
    for (const dep of deps) {
      const list = depsByType.get(dep.entityType) || [];
      list.push(dep);
      depsByType.set(dep.entityType, list);
    }

    // Fetch entity dictionaries only for types we need (single selector call per type)
    const entityDicts = await this.getEntityDictionaries(depsByType);

    // Check all dependencies against the fetched dictionaries
    const missing: OperationDependency[] = [];
    for (const dep of deps) {
      const dict = entityDicts.get(dep.entityType);
      // If we have a dictionary for this type, check it.
      // Entity types without selectors (singleton/aggregate) are assumed to exist.
      if (dict !== undefined && !dict[dep.entityId]) {
        missing.push(dep);
      }
    }

    return { missing };
  }

  /**
   * Checks if an operation is stale because a SYNC_IMPORT deleted its hard dependencies.
   *
   * When a SYNC_IMPORT replaces the full state, operations created before the import
   * that reference entities deleted by the import become stale. Instead of throwing
   * SyncStateCorruptedError for these, we can gracefully skip them.
   *
   * @param op - The operation to check
   * @param latestImportOpId - UUIDv7 of the latest SYNC_IMPORT/BACKUP_IMPORT operation.
   *                           If undefined, no import has occurred and the op is not stale.
   * @returns true if the operation is stale (predates import AND has missing hard dependencies)
   */
  async checkIfStaleAfterImport(
    op: Operation,
    latestImportOpId?: string,
  ): Promise<boolean> {
    // No import → not stale
    if (!latestImportOpId) {
      return false;
    }

    // Operation is newer than import → not stale (created after import)
    // UUIDv7 IDs are lexicographically sortable by time
    if (op.id >= latestImportOpId) {
      return false;
    }

    // Operation predates import - check if its hard dependencies exist
    const deps = this.extractDependencies(op);
    const hardDeps = deps.filter((d) => d.mustExist);

    // No hard dependencies → not stale (nothing required)
    if (hardDeps.length === 0) {
      return false;
    }

    // Check if hard dependencies are missing in current state
    const { missing } = await this.checkDependencies(hardDeps);
    return missing.length > 0;
  }

  /**
   * Extracts ID(s) from payload based on dependency config.
   */
  private extractIdsFromPayload(
    payload: Record<string, unknown>,
    depConfig: EntityDependency,
    entityType: EntityType,
  ): string[] {
    const { payloadField } = depConfig;

    // Direct field access
    let value = payload[payloadField];

    // Handle nested paths for TAG entity (e.g., tag.changes.taskIds)
    if (!value && entityType === 'TAG' && payloadField === 'taskIds') {
      const tag = payload['tag'] as { changes?: { taskIds?: string[] } } | undefined;
      value = tag?.changes?.taskIds;
    }

    if (!value) return [];

    // Return as array
    if (Array.isArray(value)) {
      return value.filter((v): v is string => typeof v === 'string');
    }
    if (typeof value === 'string') {
      return [value];
    }
    return [];
  }

  /**
   * Fetches entity dictionaries for the requested entity types.
   * Only makes one selector call per entity type, regardless of how many entities are checked.
   */
  private async getEntityDictionaries(
    depsByType: Map<EntityType, OperationDependency[]>,
  ): Promise<Map<EntityType, Dictionary<unknown> | undefined>> {
    const result = new Map<EntityType, Dictionary<unknown> | undefined>();
    const promises: Promise<void>[] = [];

    for (const entityType of depsByType.keys()) {
      const config = getEntityConfig(entityType);
      if (config && isAdapterEntity(config) && config.selectEntities) {
        promises.push(
          firstValueFrom(this.store.select(config.selectEntities)).then((dict) => {
            result.set(entityType, dict);
          }),
        );
      }
      // Entity types not adapters are singleton/aggregate - assumed to exist
    }

    await Promise.all(promises);
    return result;
  }
}
