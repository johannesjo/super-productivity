import { EncryptAndCompressCfg, LocalMeta, RemoteMeta } from '../pfapi.model';
import { SyncProviderServiceInterface } from './sync-provider.interface';
import { MiniObservable } from '../util/mini-observable';
import {
  LockFromLocalClientPresentError,
  LockPresentError,
  NoRemoteMetaFile,
  RemoteFileNotFoundAPIError,
} from '../errors/errors';
import { PFLog } from '../../../core/log';
import { MetaModelCtrl } from '../model-ctrl/meta-model-ctrl';
import { EncryptAndCompressHandlerService } from './encrypt-and-compress-handler.service';
import { validateMetaBase } from '../util/validate-meta-base';
import { SyncProviderId } from '../pfapi.const';

/**
 * Lock TTL in milliseconds (5 minutes)
 * Locks older than this are considered stale and ignored
 */
const LOCK_TTL_MS = 5 * 60 * 1000;

/**
 * Service responsible for synchronizing metadata between local and remote storage
 */
export class MetaSyncService {
  private static readonly L = 'MetaSyncService';

  constructor(
    private _metaModelCtrl: MetaModelCtrl,
    private _currentSyncProvider$: MiniObservable<SyncProviderServiceInterface<SyncProviderId> | null>,
    private _encryptAndCompressHandler: EncryptAndCompressHandlerService,
    private _encryptAndCompressCfg$: MiniObservable<EncryptAndCompressCfg>,
  ) {}

  /**
   * Save metadata to local storage
   * @param localMetaFileContent The metadata to save locally
   * @returns Promise resolving when save is complete
   */
  async saveLocal(localMetaFileContent: LocalMeta): Promise<unknown> {
    PFLog.normal(`${MetaSyncService.L}.${this.saveLocal.name}()`, {
      localMetaFileContent,
      lastUpdate: localMetaFileContent.lastUpdate,
      lastSyncedUpdate: localMetaFileContent.lastSyncedUpdate,
      willMatch:
        localMetaFileContent.lastUpdate === localMetaFileContent.lastSyncedUpdate,
    });
    // Pass isIgnoreDBLock = true since we're saving during sync operations
    // and the database is locked by _wrapSyncAction
    return this._metaModelCtrl.save(localMetaFileContent, true);
  }

  /**
   * Download metadata from remote storage
   * @returns Promise with the remote metadata and its revision
   * @throws NoRemoteMetaFile if the remote file doesn't exist
   * @throws LockPresentError if a lock is present from another client
   * @throws LockFromLocalClientPresentError if a lock is present from this client
   */
  async download(): Promise<{ remoteMeta: RemoteMeta; remoteMetaRev: string }> {
    // return {} as any as MetaFileContent;
    PFLog.normal(`${MetaSyncService.L}.${this.download.name}()`);
    const syncProvider = this._currentSyncProvider$.getOrError();

    try {
      const r = await syncProvider.downloadFile(
        MetaModelCtrl.META_MODEL_REMOTE_FILE_NAME,
      );

      // Check if file is locked
      if (r.dataStr.startsWith(MetaModelCtrl.META_FILE_LOCK_CONTENT_PREFIX)) {
        const lockContent = r.dataStr
          .slice(MetaModelCtrl.META_FILE_LOCK_CONTENT_PREFIX.length)
          .replace(/\n/g, '');

        // Parse lock content - format: "clientId:timestamp" or legacy "clientId"
        const colonIndex = lockContent.lastIndexOf(':');
        let lockClientId: string;
        let lockTimestamp: number | null = null;

        if (colonIndex > 0) {
          // New format with timestamp
          lockClientId = lockContent.slice(0, colonIndex);
          lockTimestamp = parseInt(lockContent.slice(colonIndex + 1), 10);
        } else {
          // Legacy format without timestamp - treat as potentially stale
          lockClientId = lockContent;
        }

        const currentClientId = await this._metaModelCtrl.loadClientId();

        // Check if lock is expired (TTL exceeded or no timestamp = legacy lock)
        const lockAge = lockTimestamp ? Date.now() - lockTimestamp : Infinity;
        const isLockExpired = lockAge > LOCK_TTL_MS;

        if (isLockExpired) {
          PFLog.warn(
            `${MetaSyncService.L}.${this.download.name}(): Stale lock detected, ignoring`,
            {
              lockClientId,
              lockTimestamp,
              lockAge,
              ttl: LOCK_TTL_MS,
            },
          );
          // Continue to regular processing - stale lock will be overwritten on next upload
        } else if (lockClientId === currentClientId) {
          throw new LockFromLocalClientPresentError();
        } else {
          throw new LockPresentError(lockClientId);
        }
      }

      // Process data
      const data =
        await this._encryptAndCompressHandler.decompressAndDecryptData<RemoteMeta>(
          this._encryptAndCompressCfg$.value,
          (await syncProvider.privateCfg.load())?.encryptKey,
          r.dataStr,
        );

      return { remoteMeta: validateMetaBase(data), remoteMetaRev: r.rev };
    } catch (e) {
      if (e instanceof RemoteFileNotFoundAPIError) {
        throw new NoRemoteMetaFile();
      }
      throw e;
    }
  }

  /**
   * Upload metadata to remote storage
   * @param meta The metadata to upload
   * @param revToMatch Optional revision that the remote file must match for the upload to succeed
   * @returns Promise resolving to the new revision string
   */
  async upload(meta: RemoteMeta, revToMatch: string | null = null): Promise<string> {
    const syncProvider = this._currentSyncProvider$.getOrError();

    // Validate and prepare data
    const validatedMeta = validateMetaBase(meta);
    const encryptedAndCompressedData =
      await this._encryptAndCompressHandler.compressAndEncryptData(
        this._encryptAndCompressCfg$.value,
        (await syncProvider.privateCfg.load())?.encryptKey,
        validatedMeta,
        meta.crossModelVersion,
      );

    PFLog.normal(`${MetaSyncService.L}.${this.upload.name}()`, { meta });

    // Upload the data
    return (
      await syncProvider.uploadFile(
        MetaModelCtrl.META_MODEL_REMOTE_FILE_NAME,
        encryptedAndCompressedData,
        revToMatch,
        true,
      )
    ).rev;
  }

  /**
   * Get the revision of the remote metadata file
   * @param localRev Optional local revision for comparison
   * @returns Promise resolving to the remote revision string
   * @throws NoRemoteMetaFile if the remote file doesn't exist
   */
  async getRev(localRev: string | null): Promise<string> {
    PFLog.normal(`${MetaSyncService.L}.${this.getRev.name}()`, { localRev });
    const syncProvider = this._currentSyncProvider$.getOrError();

    try {
      const r = await syncProvider.getFileRev(
        MetaModelCtrl.META_MODEL_REMOTE_FILE_NAME,
        localRev || null,
      );
      return r.rev;
    } catch (e) {
      if (e instanceof RemoteFileNotFoundAPIError) {
        throw new NoRemoteMetaFile();
      }
      throw e;
    }
  }

  /**
   * Create a lock on the remote metadata file
   * Lock format: SYNC_IN_PROGRESS__clientId:timestamp
   * @param revToMatch Optional revision that the remote file must match for the lock to succeed
   * @returns Promise resolving to the new revision string
   */
  async lock(revToMatch: string | null = null): Promise<string> {
    PFLog.normal(`${MetaSyncService.L}.${this.lock.name}()`, { revToMatch });
    const syncProvider = this._currentSyncProvider$.getOrError();
    const clientId = await this._metaModelCtrl.loadClientId();
    const timestamp = Date.now();

    // Lock content format: "SYNC_IN_PROGRESS__clientId:timestamp"
    const lockContent = `${MetaModelCtrl.META_FILE_LOCK_CONTENT_PREFIX}${clientId}:${timestamp}`;

    return (
      await syncProvider.uploadFile(
        MetaModelCtrl.META_MODEL_REMOTE_FILE_NAME,
        lockContent,
        revToMatch,
        true,
      )
    ).rev;
  }
}
