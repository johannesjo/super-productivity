import {
  SyncProviderAuthHelper,
  SyncProviderServiceInterface,
} from '../../sync-provider.interface';
import { SyncProviderId } from '../../../pfapi.const';
import {
  AuthFailSPError,
  InvalidDataSPError,
  RemoteFileNotFoundAPIError,
  NoRevAPIError,
} from '../../../errors/errors';
import { PFLog } from '../../../../../core/log';
import { DropboxApi } from './dropbox-api';
import { generatePKCECodes } from './generate-pkce-codes';
import { SyncProviderPrivateCfgStore } from '../../sync-provider-private-cfg-store';
import { SyncProviderPrivateCfgBase } from '../../../pfapi.model';

const DROPBOX_AUTH_URL = 'https://www.dropbox.com/oauth2/authorize' as const;
const PATH_NOT_FOUND_ERROR = 'path/not_found' as const;
const EXPIRED_TOKEN_ERROR = 'expired_access_token' as const;
const INVALID_TOKEN_ERROR = 'invalid_access_token' as const;

export interface DropboxCfg {
  appKey: string;
  basePath: string;
}

export interface DropboxPrivateCfg extends SyncProviderPrivateCfgBase {
  accessToken: string;
  refreshToken: string;
}

interface DropboxApiError {
  response?: {
    status: number;
    data?: {
      error_summary?: string;
    };
  };
}

export class Dropbox implements SyncProviderServiceInterface<SyncProviderId.Dropbox> {
  private static readonly L = 'Dropbox';

  readonly id = SyncProviderId.Dropbox;
  readonly isUploadForcePossible = true;
  readonly maxConcurrentRequests = 4;

  private readonly _api: DropboxApi;
  private readonly _appKey: string;
  private readonly _basePath: string;

  public privateCfg!: SyncProviderPrivateCfgStore<SyncProviderId.Dropbox>;

  constructor(cfg: DropboxCfg) {
    if (!cfg.appKey) {
      throw new Error('Missing appKey for Dropbox');
    }
    this._appKey = cfg.appKey;
    this._basePath = cfg.basePath || '/';
    this._api = new DropboxApi(this._appKey, this);
  }

  async isReady(): Promise<boolean> {
    const privateCfg = await this.privateCfg.load();
    return !!this._appKey && !!privateCfg?.accessToken && !!privateCfg?.refreshToken;
  }

  async setPrivateCfg(privateCfg: DropboxPrivateCfg): Promise<void> {
    await this.privateCfg.setComplete(privateCfg);
  }

  /**
   * Gets the revision information for a file from Dropbox
   * @param targetPath Path to the target file
   * @param localRev Local revision to compare against
   * @returns Promise with the remote revision
   * @throws RemoteFileNotFoundAPIError if the file doesn't exist
   * @throws AuthFailSPError if authentication fails
   */
  async getFileRev(targetPath: string, localRev: string): Promise<{ rev: string }> {
    try {
      const r = await this._api.getMetaData(this._getPath(targetPath), localRev);
      return {
        rev: r.rev,
      };
    } catch (e) {
      if (this._isTokenError(e)) {
        PFLog.critical('EXPIRED or INVALID TOKEN, trying to refresh');
        await this._api.updateAccessTokenFromRefreshTokenIfAvailable();
        return this.getFileRev(targetPath, localRev);
      }

      if (this._isPathNotFoundError(e)) {
        throw new RemoteFileNotFoundAPIError(targetPath);
      }

      if (this._isUnauthorizedError(e)) {
        throw new AuthFailSPError('Dropbox 401 getFileRev', targetPath);
      }

      throw e;
    }
  }

  /**
   * Downloads a file from Dropbox
   * @param targetPath Path to the target file
   * @param localRev Local revision to validate against
   * @returns Promise with the file data and revision
   * @throws NoRevAPIError if no revision is returned
   * @throws RemoteFileNotFoundAPIError if the file doesn't exist
   * @throws InvalidDataSPError if the data is invalid
   */
  async downloadFile(targetPath: string): Promise<{ rev: string; dataStr: string }> {
    try {
      const r = await this._api.download({
        path: this._getPath(targetPath),
      });

      if (!r.meta.rev) {
        throw new NoRevAPIError();
      }

      if (!r.data) {
        throw new RemoteFileNotFoundAPIError(targetPath);
      }

      if (typeof r.data !== 'string') {
        PFLog.critical(`${Dropbox.L}.${this.downloadFile.name}() data`, r.data);
        throw new InvalidDataSPError(r.data);
      }

      return {
        rev: r.meta.rev,
        dataStr: r.data,
      };
    } catch (e) {
      if (this._isTokenError(e)) {
        PFLog.critical('EXPIRED or INVALID TOKEN, trying to refresh');
        await this._api.updateAccessTokenFromRefreshTokenIfAvailable();
        return this.downloadFile(targetPath);
      }
      throw e;
    }
  }

  /**
   * Uploads a file to Dropbox
   * @param targetPath Path to the target file
   * @param dataStr Data to upload
   * @param revToMatch Revision to match for conflict prevention
   * @param isForceOverwrite Whether to force overwrite the file
   * @returns Promise with the new revision
   * @throws NoRevAPIError if no revision is returned
   */
  async uploadFile(
    targetPath: string,
    dataStr: string,
    revToMatch: string,
    isForceOverwrite: boolean = false,
  ): Promise<{ rev: string }> {
    try {
      const r = await this._api.upload({
        path: this._getPath(targetPath),
        data: dataStr,
        revToMatch,
        isForceOverwrite,
      });

      if (!r.rev) {
        throw new NoRevAPIError();
      }

      return {
        rev: r.rev,
      };
    } catch (e) {
      if (this._isTokenError(e)) {
        PFLog.critical('EXPIRED or INVALID TOKEN, trying to refresh');
        await this._api.updateAccessTokenFromRefreshTokenIfAvailable();
        return this.uploadFile(targetPath, dataStr, revToMatch, isForceOverwrite);
      }
      throw e;
    }
  }

  /**
   * Removes a file from Dropbox
   * @param targetPath Path to the target file
   * @throws RemoteFileNotFoundAPIError if the file doesn't exist
   * @throws AuthFailSPError if authentication fails
   */
  async removeFile(targetPath: string): Promise<void> {
    try {
      await this._api.remove(this._getPath(targetPath));
    } catch (e) {
      if (this._isTokenError(e)) {
        PFLog.critical('EXPIRED or INVALID TOKEN, trying to refresh');
        await this._api.updateAccessTokenFromRefreshTokenIfAvailable();
        return this.removeFile(targetPath);
      }

      if (this._isPathNotFoundError(e)) {
        throw new RemoteFileNotFoundAPIError(targetPath);
      }

      if (this._isUnauthorizedError(e)) {
        throw new AuthFailSPError('Dropbox 401 removeFile', targetPath);
      }

      throw e;
    }
  }

  /**
   * Gets authentication helper for OAuth flow
   * @returns Promise with auth helper object
   */
  async getAuthHelper(): Promise<SyncProviderAuthHelper> {
    const { codeVerifier, codeChallenge } = await generatePKCECodes(128);

    const authCodeUrl =
      `${DROPBOX_AUTH_URL}` +
      `?response_type=code&client_id=${this._appKey}` +
      '&code_challenge_method=S256' +
      '&token_access_type=offline' +
      `&code_challenge=${codeChallenge}`;

    return {
      authUrl: authCodeUrl,
      codeVerifier,
      verifyCodeChallenge: async <T>(authCode: string) => {
        return (await this._api.getTokensFromAuthCode(authCode, codeVerifier)) as T;
      },
    };
  }

  /**
   * Gets the full path including base path
   * @param path The relative path
   * @returns The full path
   */
  private _getPath(path: string): string {
    return this._basePath + path;
  }

  /**
   * Checks if an error is a path not found error
   * @param e The error to check
   * @returns True if it's a path not found error
   */
  private _isPathNotFoundError(e: unknown): boolean {
    const apiError = e as DropboxApiError;
    return !!apiError?.response?.data?.error_summary?.includes(PATH_NOT_FOUND_ERROR);
  }

  /**
   * Checks if an error is an unauthorized error
   * @param e The error to check
   * @returns True if it's an unauthorized error
   */
  private _isUnauthorizedError(e: unknown): boolean {
    const apiError = e as DropboxApiError;
    return apiError?.response?.status === 401;
  }

  /**
   * Checks if an error is related to expired or invalid tokens
   * @param e The error to check
   * @returns True if it's a token-related error
   */
  private _isTokenError(e: unknown): boolean {
    const apiError = e as DropboxApiError;
    return !!(
      apiError?.response?.status === 401 &&
      (apiError.response.data?.error_summary?.includes(EXPIRED_TOKEN_ERROR) ||
        apiError.response.data?.error_summary?.includes(INVALID_TOKEN_ERROR))
    );
  }
}
