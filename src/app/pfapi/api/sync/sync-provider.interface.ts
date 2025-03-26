import { SyncProviderId } from '../pfapi.const';
import { SyncProviderPrivateCfgStore } from './sync-provider-private-cfg-store';

export interface SyncProviderAuthHelper {
  authUrl?: string;
  codeVerifier?: string;
  verifyCodeChallenge?(codeChallenge: string): Promise<{
    accessToken: string;
    refreshToken: string;
    expiresAt: number;
  }>;
}

export interface SyncProviderServiceInterface<C> {
  id: SyncProviderId;
  isUploadForcePossible?: boolean;
  maxConcurrentRequests: number;

  privateCfg: SyncProviderPrivateCfgStore<C>;

  /**
   * Gets the current revision and last update time for a file
   * @param targetPath Path to the file
   * @param localRev Current local revision; can be used to check if download is necessary
   */
  getFileRev(targetPath: string, localRev: string | null): Promise<{ rev: string }>;

  /**
   * Downloads file data from the sync provider
   * @param targetPath Path to the file
   * @param localRev Current local revision; can be used to check if download is necessary
   */
  downloadFile(
    targetPath: string,
    localRev: string | null,
  ): Promise<{ rev: string; dataStr: string }>;

  /**
   * Uploads file data to the sync provider
   * @param targetPath Path to the file
   * @param dataStr Serialized file data
   * @param revToMatch If revision does not match, the upload will fail
   * @param isForceOverwrite Whether to force overwrite existing file
   */
  uploadFile(
    targetPath: string,
    dataStr: string,
    revToMatch: string | null,
    isForceOverwrite?: boolean,
  ): Promise<{ rev: string }>;

  removeFile(targetPath: string): Promise<void>;

  // createFolder(targetPath: string): Promise<void>;
  // ensureDirectoryExists?(directoryPath: string): Promise<void>;

  // Auth
  isReady(): Promise<boolean>;

  getAuthHelper?(): Promise<SyncProviderAuthHelper>;

  setPrivateCfg(privateCfg: C): Promise<void>;
}
