/* eslint-disable @typescript-eslint/naming-convention */

import { stringify } from 'query-string';
import { DropboxFileMetadata } from '../../../imex/sync/dropbox/dropbox.model';
import axios, { AxiosError, AxiosResponse, Method } from 'axios';
import { DropboxCredentials } from './dropbox';
import { MiniObservable } from '../../util/mini-observable';
import { AuthNotConfiguredError, NoRemoteDataError } from '../../errors/errors';
import { pfLog } from '../../util/log';

export class DropboxApi {
  private _credentials$: MiniObservable<DropboxCredentials | null>;
  private _appKey: string;

  constructor(appKey: string, credentials$: MiniObservable<DropboxCredentials | null>) {
    this._appKey = appKey;
    this._credentials$ = credentials$;
  }

  async getMetaData(path: string): Promise<DropboxFileMetadata> {
    return this._request({
      method: 'POST',
      url: 'https://api.dropboxapi.com/2/files/get_metadata',
      data: { path },
    }).then((res) => res.data);
  }

  async download<T>({
    path,
    localRev,
  }: {
    path: string;
    localRev?: string | null;
  }): Promise<{ meta: DropboxFileMetadata; data: T }> {
    try {
      const res = await this._request({
        method: 'POST',
        url: 'https://content.dropboxapi.com/2/files/download',
        headers: {
          'Dropbox-API-Arg': JSON.stringify({ path }),
          // NOTE: doesn't do much, because we rarely get to the case where it would be
          // useful due to our pre meta checks and because data often changes after
          // we're checking it.
          // If it messes up => Check service worker!
          ...(localRev ? { 'If-None-Match': localRev } : {}),
          // circumvent:
          // https://github.com/angular/angular/issues/37133
          // https://github.com/johannesjo/super-productivity/issues/645
          // 'ngsw-bypass': true
        },
      });
      const meta = JSON.parse(res.headers['dropbox-api-result']);
      return { meta, data: res.data };
    } catch (e) {
      if (
        typeof e === 'object' &&
        ((e as AxiosError)?.response?.data as any)?.error_summary?.includes(
          'path/not_found/',
        )
      ) {
        throw new NoRemoteDataError(undefined, e);
      } else {
        throw e;
      }
    }
  }

  async upload({
    path,
    localRev,
    data,
    isForceOverwrite = false,
  }: {
    path: string;
    localRev?: string | null;
    data: any;
    isForceOverwrite?: boolean;
  }): Promise<DropboxFileMetadata> {
    const args = {
      mode: { '.tag': 'overwrite' },
      path,
      mute: true,
      // ...(typeof clientModified === 'number'
      //   ? // we need to use ISO 8601 "combined date and time representation" format:
      //     { client_modified: toDropboxIsoString(clientModified) }
      //   : {}),
    };

    if (localRev && !isForceOverwrite) {
      args.mode = { '.tag': 'update', update: localRev } as any;
    }

    return this._request({
      method: 'POST',
      url: 'https://content.dropboxapi.com/2/files/upload',
      data,
      headers: {
        'Content-Type': 'application/octet-stream',
        'Dropbox-API-Arg': JSON.stringify(args),
      },
    }).then((res) => res.data);
  }

  async checkUser(accessToken: string): Promise<unknown> {
    return this._request({
      accessToken,
      method: 'POST',
      url: 'https://api.dropboxapi.com/2/check/user',
    }).then((res) => res.data);
  }

  async _request({
    url,
    method = 'GET',
    data,
    headers = {},
    params,
    isSkipTokenRefresh = false,
  }: {
    url: string;
    method?: Method;
    headers?: { [key: string]: any };
    data?: string | Record<string, unknown>;
    params?: { [key: string]: string };
    accessToken?: string;
    isSkipTokenRefresh?: boolean;
  }): Promise<AxiosResponse> {
    if (!this._credentials$.value?.accessToken) {
      throw new AuthNotConfiguredError('Dropbox no token');
    }

    try {
      return await axios.request({
        url: params && Object.keys(params).length ? `${url}?${stringify(params)}` : url,
        method,
        data,
        headers: {
          authorization: `Bearer ${this._credentials$.value?.accessToken}`,
          'Content-Type': 'application/json;charset=UTF-8',
          ...headers,
        },
      });
    } catch (e) {
      if (e && (e as any).response?.status === 401) {
        await this.updateAccessTokenFromRefreshTokenIfAvailable();
        return this._request({
          url,
          method,
          data,
          headers,
          params,
          isSkipTokenRefresh: true,
        });
      }
      throw e;
    }
  }

  // async getAccessTokenViaDialog(): Promise<{
  //   accessToken: string;
  //   refreshToken: string;
  //   expiresAt: number;
  // } | null> {
  // let codeVerifier: string, codeChallenge: string;
  //
  // try {
  //   ({ codeVerifier, codeChallenge } = await generatePKCECodes(128));
  // } catch (e) {
  //   // TODO handle differently
  //   // this._snackService.open({
  //   //   msg: T.F.DROPBOX.S.UNABLE_TO_GENERATE_PKCE_CHALLENGE,
  //   //   type: 'ERROR',
  //   // });
  //   return null;
  // }
  //
  // const DROPBOX_AUTH_CODE_URL =
  //   `https://www.dropbox.com/oauth2/authorize` +
  //   `?response_type=code&client_id=${this._accessToken}` +
  //   '&code_challenge_method=S256' +
  //   '&token_access_type=offline' +
  //   `&code_challenge=${codeChallenge}`;
  //
  // // TODO handle differently
  // const authCode = await this._matDialog
  //   .open(DialogGetAndEnterAuthCodeComponent, {
  //     restoreFocus: true,
  //     data: {
  //       providerName: 'Dropbox',
  //       url: DROPBOX_AUTH_CODE_URL,
  //     },
  //   })
  //   .afterClosed()
  //   .toPromise();
  // return this._getTokensFromAuthCode(authCode, codeVerifier);
  // }

  // TODO add real type
  async updateAccessTokenFromRefreshTokenIfAvailable(): Promise<
    'SUCCESS' | 'NO_REFRESH_TOKEN' | 'ERROR'
  > {
    pfLog('updateAccessTokenFromRefreshTokenIfAvailable()');
    const refreshToken = this._credentials$.value?.refreshToken;
    if (!refreshToken) {
      console.error('Dropbox: No refresh token available');
      return 'NO_REFRESH_TOKEN';
    }

    return axios
      .request({
        url: 'https://api.dropbox.com/oauth2/token',
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded;charset=UTF-8',
        },
        data: stringify({
          refresh_token: refreshToken,
          grant_type: 'refresh_token',
          client_id: this._appKey,
        }),
      })
      .then(async (res) => {
        pfLog('Dropbox: Refresh access token Response', res);
        this._credentials$.next({
          accessToken: res.data.access_token,
          refreshToken: res.data.refresh_token || this._credentials$.value?.refreshToken,
        });
        return 'SUCCESS' as const;
      })
      .catch((e) => {
        console.error(e);
        return 'ERROR' as const;
      });
  }

  private async _getTokensFromAuthCode(
    authCode: string,
    codeVerifier: string,
  ): Promise<{
    accessToken: string;
    refreshToken: string;
    expiresAt: number;
  } | null> {
    return axios
      .request({
        url: 'https://api.dropboxapi.com/oauth2/token',
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded;charset=UTF-8',
        },
        data: stringify({
          code: authCode,
          grant_type: 'authorization_code',
          client_id: this._appKey,
          code_verifier: codeVerifier,
        }),
      })
      .then((res) => {
        // TODO handle differently
        // this._snackService.open({
        //   type: 'SUCCESS',
        //   msg: T.F.DROPBOX.S.ACCESS_TOKEN_GENERATED,
        // });

        if (typeof res.data.access_token !== 'string') {
          console.log(res);
          throw new Error('Dropbox: Invalid access token response');
        }
        if (typeof res.data.refresh_token !== 'string') {
          console.log(res);
          throw new Error('Dropbox: Invalid refresh token response');
        }
        if (typeof +res.data.expires_in !== 'number') {
          console.log(res);
          throw new Error('Dropbox: Invalid expiresIn response');
        }

        return {
          accessToken: res.data.access_token as string,
          refreshToken: res.data.refresh_token as string,
          // eslint-disable-next-line no-mixed-operators
          expiresAt: +res.data.expires_in * 1000 + Date.now(),
        };
        // Not necessary as it is highly unlikely that we get a wrong on
        // const accessToken = res.data.access_token;
        // return this.checkUser(accessToken).then(() => accessToken);
      })
      .catch((e) => {
        // TODO handle differently
        // console.error(e);
        // this._snackService.open({
        //   type: 'ERROR',
        //   msg: T.F.DROPBOX.S.ACCESS_TOKEN_ERROR,
        // });
        return null;
      });
  }
}
