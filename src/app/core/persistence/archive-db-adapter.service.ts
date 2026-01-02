import { Injectable } from '@angular/core';
import { DBSchema, IDBPDatabase, openDB } from 'idb';
import { ArchiveModel } from '../../features/time-tracking/time-tracking.model';
import { PFLog } from '../log';

/**
 * Database key constants for archive storage.
 */
const DB_KEY_ARCHIVE_YOUNG = 'archiveYoung' as const;
const DB_KEY_ARCHIVE_OLD = 'archiveOld' as const;

/**
 * Database configuration matching PFAPI's IndexedDbAdapter.
 * The 'pf' database with 'main' object store is shared with PFAPI.
 */
const DB_NAME = 'pf';
const DB_MAIN_NAME = 'main';
const DB_VERSION = 1;

/**
 * Minimal schema for the PFAPI database.
 * We only access archive keys, but the database may contain other data.
 */
interface PfapiDb extends DBSchema {
  [DB_MAIN_NAME]: {
    key: string;
    value: unknown;
  };
}

/**
 * Low-level IndexedDB adapter for archive storage.
 *
 * ## Purpose
 *
 * This service provides direct IndexedDB access to archive data (archiveYoung, archiveOld)
 * WITHOUT going through PfapiService. This breaks the circular dependency:
 *
 * ```
 * DataInitService → OperationLogHydratorService → OperationApplierService
 * → ArchiveOperationHandler → [THIS SERVICE instead of PfapiService]
 * ```
 *
 * ## Database Sharing
 *
 * This service opens a connection to the same 'pf' database that PFAPI uses.
 * IndexedDB supports multiple connections to the same database, and since we
 * only use this for archive operations that specify `isIgnoreDBLock: true`,
 * there's no conflict with PFAPI's lock mechanism.
 *
 * ## Usage
 *
 * Used by `ArchiveOperationHandler` for:
 * - `_handleFlushYoungToOld()`: Reading/writing archiveYoung and archiveOld
 * - `_handleLoadAllData()`: Writing archive data from SYNC_IMPORT/BACKUP_IMPORT
 *
 * @see src/app/op-log/apply/archive-operation-handler.service.ts
 */
@Injectable({
  providedIn: 'root',
})
export class ArchiveDbAdapter {
  private _db?: IDBPDatabase<PfapiDb>;
  private _initPromise?: Promise<void>;

  /**
   * Initializes the database connection.
   * Safe to call multiple times - subsequent calls return the same promise.
   */
  async init(): Promise<void> {
    if (this._initPromise) {
      return this._initPromise;
    }

    this._initPromise = this._doInit();
    return this._initPromise;
  }

  private async _doInit(): Promise<void> {
    try {
      // Open connection to existing PFAPI database
      // Note: We don't create stores here - they're created by PFAPI
      this._db = await openDB<PfapiDb>(DB_NAME, DB_VERSION, {
        // No upgrade needed - PFAPI handles schema creation
        // If this is called before PFAPI, the database won't have the store yet
        // but that's fine because ArchiveOperationHandler is only called after data init
      });
      PFLog.normal('[ArchiveDbAdapter] Database connection initialized');
    } catch (e) {
      PFLog.err('[ArchiveDbAdapter] Failed to initialize database', e);
      this._initPromise = undefined; // Allow retry
      throw e;
    }
  }

  /**
   * Ensures the database is initialized before use.
   */
  private async _ensureDb(): Promise<IDBPDatabase<PfapiDb>> {
    if (!this._db) {
      await this.init();
    }
    if (!this._db) {
      throw new Error('[ArchiveDbAdapter] Database not initialized');
    }
    return this._db;
  }

  /**
   * Loads archiveYoung data from IndexedDB.
   */
  async loadArchiveYoung(): Promise<ArchiveModel | undefined> {
    const db = await this._ensureDb();
    const data = await db.get(DB_MAIN_NAME, DB_KEY_ARCHIVE_YOUNG);
    return data as ArchiveModel | undefined;
  }

  /**
   * Saves archiveYoung data to IndexedDB.
   */
  async saveArchiveYoung(data: ArchiveModel): Promise<void> {
    const db = await this._ensureDb();
    await db.put(DB_MAIN_NAME, data, DB_KEY_ARCHIVE_YOUNG);
  }

  /**
   * Loads archiveOld data from IndexedDB.
   */
  async loadArchiveOld(): Promise<ArchiveModel | undefined> {
    const db = await this._ensureDb();
    const data = await db.get(DB_MAIN_NAME, DB_KEY_ARCHIVE_OLD);
    return data as ArchiveModel | undefined;
  }

  /**
   * Saves archiveOld data to IndexedDB.
   */
  async saveArchiveOld(data: ArchiveModel): Promise<void> {
    const db = await this._ensureDb();
    await db.put(DB_MAIN_NAME, data, DB_KEY_ARCHIVE_OLD);
  }
}
