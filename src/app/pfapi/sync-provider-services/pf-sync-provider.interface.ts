import { PFSyncProviderId } from '../pf.model';

export interface PFSyncProviderAuthHelper {
  authUrl?: string;
  codeVerifier?: string;
}

export interface PFSyncProviderServiceInterface<C> {
  id: PFSyncProviderId;
  isUploadForcePossible?: boolean;

  getFileRevAndLastClientUpdate(
    targetPath: string,
    localRev: string | null,
  ): Promise<{ rev: string }>;

  uploadFileData(
    targetPath: string,
    dataStr: string,
    localRev: string | null,
    isForceOverwrite?: boolean,
  ): Promise<{ rev: string }>;

  downloadFileData(
    targetPath: string,
    localRev: string | null,
  ): Promise<{ rev: string; dataStr: string }>;

  // createFolder(targetPath: string): Promise<void>;

  // Auth
  isReady(): Promise<boolean>;

  getAuthHelper?(): Promise<PFSyncProviderAuthHelper>;

  setCredentials(credentials: C): Promise<void>;
}
