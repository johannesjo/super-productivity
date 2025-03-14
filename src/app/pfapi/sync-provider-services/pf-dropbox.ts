import {
  PFSyncProviderAuthHelper,
  PFSyncProviderServiceInterface,
} from './pf-sync-provider.interface';
import { PFSyncProviderId } from '../pf.model';
import {
  PFAuthFailError,
  PFInvalidDataError,
  PFNoDataError,
  PFNoRevError,
} from '../errors/pf-errors';
import { pfLog } from '../pf-log';
import { PFDropboxApi } from './pf-dropbox-api';
import { generatePKCECodes } from '../../imex/sync/generate-pkce-codes';

export interface PFDropboxCredentials {
  accessToken: string;
  refreshToken: string;
  appKey: string;
}

export class PFDropbox implements PFSyncProviderServiceInterface<PFDropboxCredentials> {
  id: PFSyncProviderId = PFSyncProviderId.Dropbox;
  isUploadForcePossible = true;

  private _api: PFDropboxApi;
  private _credentials: PFDropboxCredentials | null = null;

  constructor(credentials: PFDropboxCredentials) {
    this._api = new PFDropboxApi(credentials);
  }

  async isReady(): Promise<boolean> {
    return (
      !!this._credentials?.accessToken &&
      !!this._credentials?.appKey &&
      !!this._credentials?.refreshToken
    );
  }

  async setCredentials(credentials: PFDropboxCredentials): Promise<void> {
    this._credentials = credentials;
  }

  async getAuthHelper(): Promise<PFSyncProviderAuthHelper> {
    return this._getAuthUrlAndVerifier();
  }

  async getFileRevAndLastClientUpdate(
    targetPath: string,
    localRev: string,
  ): Promise<{ rev: string }> {
    try {
      const r = await this._api.getMetaData(targetPath);
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
        throw new PFNoDataError();
      } else if (isAxiosError && (e as any).response.status === 401) {
        if (
          (e as any).response.data?.error_summary?.includes('expired_access_token') ||
          (e as any).response.data?.error_summary?.includes('invalid_access_token')
        ) {
          pfLog('EXPIRED or INVALID TOKEN, trying to refresh');
          const refreshResult =
            await this._api.updateAccessTokenFromRefreshTokenIfAvailable();
          if (refreshResult === 'SUCCESS') {
            return this.getFileRevAndLastClientUpdate(targetPath, localRev);
          }
        }
        throw new PFAuthFailError('Dropbox 401', 401);
      } else {
        console.error(e);
        throw new Error(e as any);
      }
    }
  }

  async downloadFileData(
    targetPath: string,
    localRev: string,
  ): Promise<{ rev: string; dataStr: string }> {
    try {
      const r = await this._api.download({
        path: targetPath,
        localRev,
      });

      if (!r.meta.rev) {
        throw new PFNoRevError();
      }

      if (!r.data) {
        throw new PFNoDataError();
      }

      if (typeof r.data !== 'string') {
        throw new PFInvalidDataError();
      }

      return {
        rev: r.meta.rev,
        dataStr: r.data,
      };
    } catch (e) {
      console.error(e);
      throw new Error(e as any);
    }
  }

  async uploadFileData(
    targetPath: string,
    dataStr: string,
    localRev: string,
    isForceOverwrite: boolean = false,
  ): Promise<{ rev: string }> {
    try {
      const r = await this._api.upload({
        path: targetPath,
        data: dataStr,
        localRev,
        isForceOverwrite,
      });

      if (!r.rev) {
        throw new PFNoRevError();
      }

      return {
        rev: r.rev,
      };
    } catch (e) {
      console.error(e);
      throw new Error(e as any);
    }
  }

  private async _getAuthUrlAndVerifier(): Promise<{
    authUrl: string;
    codeVerifier: string;
  }> {
    let codeVerifier: string, codeChallenge: string;
    if (!this._credentials?.appKey) {
      throw new Error('Missing appKey for Dropbox');
    }

    try {
      ({ codeVerifier, codeChallenge } = await generatePKCECodes(128));
    } catch (e) {
      // TODO handle differently
      // this._snackService.open({
      //   msg: T.F.DROPBOX.S.UNABLE_TO_GENERATE_PKCE_CHALLENGE,
      //   type: 'ERROR',
      // });
      return null;
    }

    const authCodeUrl =
      `https://www.dropbox.com/oauth2/authorize` +
      `?response_type=code&client_id=${this._credentials.appKey}` +
      '&code_challenge_method=S256' +
      '&token_access_type=offline' +
      `&code_challenge=${codeChallenge}`;
    return {
      authUrl: authCodeUrl,
      codeVerifier,
    };
  }
}
