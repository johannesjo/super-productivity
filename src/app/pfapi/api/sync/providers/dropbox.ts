import {
  SyncProviderAuthHelper,
  SyncProviderServiceInterface,
} from '../sync-provider.interface';
import { SyncProviderId } from '../../pfapi.const';
import {
  AuthFailError,
  InvalidDataError,
  NoRemoteDataError,
  NoRevError,
} from '../../errors/errors';
import { pfLog } from '../../util/log';
import { DropboxApi } from './dropbox-api';
// TODO move over here
import { generatePKCECodes } from '../../../../imex/sync/generate-pkce-codes';
import { SyncProviderCredentialsStore } from '../sync-provider-credentials-store';

export interface DropboxCfg {
  appKey: string;
  basePath: string;
}

export interface DropboxCredentials {
  accessToken: string;
  refreshToken: string;
}

export class Dropbox implements SyncProviderServiceInterface<DropboxCredentials> {
  readonly id: SyncProviderId = SyncProviderId.Dropbox;
  readonly isUploadForcePossible = true;
  readonly maxConcurrentRequests = 4;

  private readonly _api: DropboxApi;
  private readonly _appKey: string;
  private readonly _basePath: string;

  public credentialsStore!: SyncProviderCredentialsStore<DropboxCredentials>;

  constructor(cfg: DropboxCfg) {
    if (!cfg.appKey) {
      throw new Error('Missing appKey for Dropbox');
    }

    this._appKey = cfg.appKey;
    this._basePath = cfg.basePath || '/';
    this._api = new DropboxApi(this._appKey, this);
  }

  async isReady(): Promise<boolean> {
    const credentials = await this.credentialsStore.load();
    return !!this._appKey && !!credentials?.accessToken && !!credentials?.refreshToken;
  }

  async setCredentials(credentials: DropboxCredentials): Promise<void> {
    await this.credentialsStore.save(credentials);
  }

  async getFileRev(targetPath: string, localRev: string): Promise<{ rev: string }> {
    try {
      const r = await this._api.getMetaData(this._getPath(targetPath));
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
        throw new NoRemoteDataError(targetPath);
      } else if (isAxiosError && (e as any).response.status === 401) {
        if (
          (e as any).response.data?.error_summary?.includes('expired_access_token') ||
          (e as any).response.data?.error_summary?.includes('invalid_access_token')
        ) {
          pfLog(1, 'EXPIRED or INVALID TOKEN, trying to refresh');
          const refreshResult =
            await this._api.updateAccessTokenFromRefreshTokenIfAvailable();
          if (refreshResult === 'SUCCESS') {
            return this.getFileRev(targetPath, localRev);
          }
        }
        throw new AuthFailError('Dropbox 401', 401);
      } else {
        console.error(e);
        throw new Error(e as any);
      }
    }
  }

  async downloadFile(
    targetPath: string,
    localRev: string,
  ): Promise<{ rev: string; dataStr: string }> {
    const r = await this._api.download({
      path: this._getPath(targetPath),
      localRev,
    });

    if (!r.meta.rev) {
      throw new NoRevError();
    }

    if (!r.data) {
      throw new NoRemoteDataError(targetPath);
    }

    if (typeof r.data !== 'string') {
      pfLog(1, `${Dropbox.name}.${this.downloadFile.name}() data`, r.data);
      throw new InvalidDataError(r.data);
    }

    return {
      rev: r.meta.rev,
      dataStr: r.data,
    };
  }

  async uploadFile(
    targetPath: string,
    dataStr: string,
    localRev: string,
    isForceOverwrite: boolean = false,
  ): Promise<{ rev: string }> {
    const r = await this._api.upload({
      path: this._getPath(targetPath),
      data: dataStr,
      localRev,
      isForceOverwrite,
    });

    if (!r.rev) {
      throw new NoRevError();
    }

    return {
      rev: r.rev,
    };
  }

  async removeFile(targetPath: string): Promise<void> {
    try {
      await this._api.remove(this._getPath(targetPath));
    } catch (e) {
      throw e;
    }
    // TODO error handling
  }

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

  private _getPath(path: string): string {
    return this._basePath + path;
  }
}
