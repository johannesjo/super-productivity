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
import { pfLog } from '../../../util/log';
import { DropboxApi } from './dropbox-api';
import { generatePKCECodes } from './generate-pkce-codes';
import { SyncProviderPrivateCfgStore } from '../../sync-provider-private-cfg-store';
import { SyncProviderPrivateCfgBase } from '../../../pfapi.model';

export interface DropboxCfg {
  appKey: string;
  basePath: string;
}

export interface DropboxPrivateCfg extends SyncProviderPrivateCfgBase {
  accessToken: string;
  refreshToken: string;
}

export class Dropbox implements SyncProviderServiceInterface<SyncProviderId.Dropbox> {
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
    await this.privateCfg.save(privateCfg);
  }

  /**
   * Gets the revision information for a file from Dropbox
   * @param targetPath Path to the target file
   * @param localRev Local revision to compare against
   * @returns Promise with the remote revision
   */
  async getFileRev(targetPath: string, localRev: string): Promise<{ rev: string }> {
    try {
      const r = await this._api.getMetaData(this._getPath(targetPath), localRev);
      return {
        rev: r.rev,
      };
    } catch (e) {
      const isAxiosError = !!(e && (e as any).response && (e as any).response.status);
      if (
        isAxiosError &&
        (e as any).response.data &&
        // NOTE: sometimes 'path/not_found/..' and sometimes 'path/not_found/...'
        (e as any).response.data.error_summary?.includes('path/not_found')
      ) {
        throw new RemoteFileNotFoundAPIError(targetPath);
      } else if (isAxiosError && (e as any).response.status === 401) {
        if (
          (e as any).response.data?.error_summary?.includes('expired_access_token') ||
          (e as any).response.data?.error_summary?.includes('invalid_access_token')
        ) {
          pfLog(0, 'EXPIRED or INVALID TOKEN, trying to refresh');
          await this._api.updateAccessTokenFromRefreshTokenIfAvailable();
          return this.getFileRev(targetPath, localRev);
        }
        throw new AuthFailSPError('Dropbox 401 getFileRev', targetPath);
      } else {
        throw e;
      }
    }
  }

  /**
   * Downloads a file from Dropbox
   * @param targetPath Path to the target file
   * @param localRev Local revision to validate against
   * @returns Promise with the file data and revision
   */
  async downloadFile(
    targetPath: string,
    localRev: string,
  ): Promise<{ rev: string; dataStr: string }> {
    const r = await this._api.download({
      path: this._getPath(targetPath),
      localRev,
    });

    if (!r.meta.rev) {
      throw new NoRevAPIError();
    }

    if (!r.data) {
      throw new RemoteFileNotFoundAPIError(targetPath);
    }

    if (typeof r.data !== 'string') {
      pfLog(0, `${Dropbox.name}.${this.downloadFile.name}() data`, r.data);
      throw new InvalidDataSPError(r.data);
    }

    return {
      rev: r.meta.rev,
      dataStr: r.data,
    };
  }

  /**
   * Uploads a file to Dropbox
   * @param targetPath Path to the target file
   * @param dataStr Data to upload
   * @param revToMatch Revision to match for conflict prevention
   * @param isForceOverwrite Whether to force overwrite the file
   * @returns Promise with the new revision
   */
  async uploadFile(
    targetPath: string,
    dataStr: string,
    revToMatch: string,
    isForceOverwrite: boolean = false,
  ): Promise<{ rev: string }> {
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
  }

  /**
   * Removes a file from Dropbox
   * @param targetPath Path to the target file
   */
  async removeFile(targetPath: string): Promise<void> {
    try {
      await this._api.remove(this._getPath(targetPath));
    } catch (e) {
      throw e;
    }
    // TODO error handling
  }

  /**
   * Gets authentication helper for OAuth flow
   * @returns Promise with auth helper object
   */
  async getAuthHelper(): Promise<SyncProviderAuthHelper> {
    const { codeVerifier, codeChallenge } = await generatePKCECodes(128);

    const authCodeUrl =
      `https://www.dropbox.com/oauth2/authorize` +
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
}
