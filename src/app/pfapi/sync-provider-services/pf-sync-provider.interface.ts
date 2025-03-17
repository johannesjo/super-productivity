import { PFSyncProviderId } from '../pf.const';

export interface PFSyncProviderAuthHelper {
  authUrl?: string;
  codeVerifier?: string;
}

export interface PFSyncProviderServiceInterface<C> {
  id: PFSyncProviderId;
  isUploadForcePossible?: boolean;

  /**
   * Gets the current revision and last update time for a file
   * @param targetPath Path to the file
   * @param localRev Current local revision or null if none
   */
  getFileRevAndLastClientUpdate(
    targetPath: string,
    localRev: string | null,
  ): Promise<{ rev: string }>;

  /**
   * Uploads file data to the sync provider
   * @param targetPath Path to the file
   * @param dataStr Serialized file data
   * @param localRev Current local revision or null if none
   * @param isForceOverwrite Whether to force overwrite existing file
   */
  uploadFileData(
    targetPath: string,
    dataStr: string,
    localRev: string | null,
    isForceOverwrite?: boolean,
  ): Promise<{ rev: string }>;

  /**
   * Downloads file data from the sync provider
   * @param targetPath Path to the file
   * @param localRev Current local revision or null if none
   */
  downloadFileData(
    targetPath: string,
    localRev: string | null,
  ): Promise<{ rev: string; dataStr: string }>;

  // createFolder(targetPath: string): Promise<void>;
  // ensureDirectoryExists?(directoryPath: string): Promise<void>;

  // Auth
  isReady(): Promise<boolean>;

  getAuthHelper?(): Promise<PFSyncProviderAuthHelper>;

  setCredentials(credentials: C): Promise<void>;
}
