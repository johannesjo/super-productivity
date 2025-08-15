import { SyncProviderId } from '../pfapi.const';
import { SyncProviderPrivateCfgStore } from './sync-provider-private-cfg-store';
import { PrivateCfgByProviderId } from '../pfapi.model';

/**
 * Authentication helper interface for OAuth flows
 */
export interface SyncProviderAuthHelper {
  /** URL to redirect user for authentication */
  authUrl?: string;
  /** Code verifier for PKCE authentication flow */
  codeVerifier?: string;

  /**
   * Verifies the code challenge and returns authentication tokens
   * @param codeChallenge The code challenge from the OAuth redirect
   * @returns Authentication tokens and expiration
   */
  verifyCodeChallenge?(codeChallenge: string): Promise<{
    accessToken: string;
    refreshToken: string;
    expiresAt: number;
  }>;
}

/**
 * Core sync provider service interface
 */
export interface SyncProviderServiceInterface<PID extends SyncProviderId> {
  /** Unique identifier for this sync provider */
  id: PID;

  /** Whether this provider supports force upload (overwriting conflicts) */
  isUploadForcePossible?: boolean;

  /** Whether this provider is limited to syncing a single file */
  isLimitedToSingleFileSync?: boolean;

  /** Maximum number of concurrent requests allowed */
  maxConcurrentRequests: number;

  /** Store for provider-specific private configuration */
  privateCfg: SyncProviderPrivateCfgStore<PID>;

  /**
   * Gets the current revision for a file
   * @param targetPath Path to the file
   * @param localRev Current local revision; can be used to check if download is necessary
   * @returns The current revision information
   * @throws Error if the operation fails
   */
  getFileRev(targetPath: string, localRev: string | null): Promise<FileRevResponse>;

  /**
   * Downloads file data from the sync provider
   * @param targetPath Path to the file
   * @returns The file data and revision information
   * @throws Error if the download fails
   */
  downloadFile(targetPath: string): Promise<FileDownloadResponse>;

  /**
   * Uploads file data to the sync provider
   * @param targetPath Path to the file
   * @param dataStr Serialized file data
   * @param revToMatch If revision does not match, the upload will fail
   * @param isForceOverwrite Whether to force overwrite existing file
   * @returns The new revision information after successful upload
   * @throws Error if the upload fails or revision conflict occurs
   */
  uploadFile(
    targetPath: string,
    dataStr: string,
    revToMatch: string | null,
    isForceOverwrite?: boolean,
  ): Promise<FileRevResponse>;

  /**
   * Removes a file from the sync provider
   * @param targetPath Path to the file to remove
   * @throws Error if the removal fails
   */
  removeFile(targetPath: string): Promise<void>;

  /**
   * Checks if the provider is ready to perform sync operations
   * @returns True if the provider is authenticated and ready
   */
  isReady(): Promise<boolean>;

  /**
   * Gets authentication helper for initiating auth flows
   * @returns Auth helper object or undefined if not supported
   */
  getAuthHelper?(): Promise<SyncProviderAuthHelper>;

  /**
   * Updates the provider's private configuration
   * @param privateCfg New configuration to store
   */
  setPrivateCfg(privateCfg: PrivateCfgByProviderId<PID>): Promise<void>;
}

/**
 * Response for file revision operations
 */
export interface FileRevResponse {
  /** The current revision identifier for the file */
  rev: string;
  legacyRev?: string;
}

/**
 * Response for file download operations
 */
export interface FileDownloadResponse extends FileRevResponse {
  /** The file content as a string */
  dataStr: string;
}
