/* eslint-disable @typescript-eslint/naming-convention */

import { stringify } from 'query-string';
import { DropboxFileMetadata } from '../../../../../imex/sync/dropbox/dropbox.model';
import { DropboxPrivateCfg } from './dropbox';
import {
  MissingCredentialsSPError,
  RemoteFileNotFoundAPIError,
  TooManyRequestsAPIError,
} from '../../../errors/errors';
import { pfLog } from '../../../util/log';
import { SyncProviderServiceInterface } from '../../sync-provider.interface';

type HttpMethod = 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH' | 'HEAD' | 'OPTIONS';

export class DropboxApi {
  private _appKey: string;
  private _parent: SyncProviderServiceInterface<DropboxPrivateCfg>;

  constructor(appKey: string, parent: SyncProviderServiceInterface<DropboxPrivateCfg>) {
    this._appKey = appKey;
    this._parent = parent;
  }

  async getMetaData(path: string): Promise<DropboxFileMetadata> {
    const response = await this._request({
      method: 'POST',
      url: 'https://api.dropboxapi.com/2/files/get_metadata',
      data: { path },
      headers: { 'Content-Type': 'application/json' },
    });
    return response.json();
  }

  async download<T>({
    path,
    localRev,
  }: {
    path: string;
    localRev?: string | null;
  }): Promise<{ meta: DropboxFileMetadata; data: T }> {
    try {
      const response = await this._request({
        method: 'POST',
        url: 'https://content.dropboxapi.com/2/files/download',
        headers: {
          'Dropbox-API-Arg': JSON.stringify({ path }),
          ...(localRev ? { 'If-None-Match': localRev } : {}),
        },
      });

      const apiResult = response.headers.get('dropbox-api-result');
      const meta = apiResult ? JSON.parse(apiResult) : {};
      const data = await response.text();

      return { meta, data: data as unknown as T };
    } catch (e: any) {
      if (e?.error_summary?.includes('path/not_found/')) {
        throw new RemoteFileNotFoundAPIError(path, e);
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
    };

    if (!isForceOverwrite) {
      args.mode = localRev
        ? ({ '.tag': 'update', update: localRev } as any)
        : { '.tag': 'update', update: '01630c96b4d421c00000001ce2a2770' };
    }

    const response = await this._request({
      method: 'POST',
      url: 'https://content.dropboxapi.com/2/files/upload',
      data,
      headers: {
        'Dropbox-API-Arg': JSON.stringify(args),
      },
    });
    return response.json();
  }

  async remove(path: string): Promise<unknown> {
    const response = await this._request({
      method: 'POST',
      url: 'https://api.dropboxapi.com/2/files/delete_v2',
      data: { path },
    });
    return response.json();
  }

  async _request({
    url,
    method = 'GET',
    data,
    headers = {},
    params,
    accessToken,
    isSkipTokenRefresh = false,
  }: {
    url: string;
    method?: HttpMethod;
    headers?: { [key: string]: any };
    data?: string | Record<string, unknown>;
    params?: { [key: string]: string };
    accessToken?: string;
    isSkipTokenRefresh?: boolean;
  }): Promise<Response> {
    let token = accessToken;
    if (!token) {
      const privateCfg = await this._parent.privateCfg.load();
      if (!privateCfg?.accessToken) {
        throw new MissingCredentialsSPError('Dropbox no token');
      }
      token = privateCfg.accessToken;
    }

    // Add query params if needed
    const requestUrl =
      params && Object.keys(params).length ? `${url}?${stringify(params)}` : url;

    // Prepare request options
    const requestOptions: RequestInit = {
      method,
      headers: {
        Authorization: `Bearer ${token}`,
        ...((method === 'POST' || method === 'PUT') && {
          'Content-Type': 'application/octet-stream',
        }),
        ...headers,
      },
    };

    // Add request body if data is present
    if (data !== undefined) {
      requestOptions.body = typeof data === 'string' ? data : JSON.stringify(data);
    }

    const response = await fetch(requestUrl, requestOptions);

    // Handle token refresh
    if (response.status === 401 && !isSkipTokenRefresh) {
      await this.updateAccessTokenFromRefreshTokenIfAvailable();
      // retry once
      return this._request({
        url,
        method,
        data,
        headers,
        params,
        isSkipTokenRefresh: true,
      });
    }

    // Handle errors
    if (!response.ok) {
      let responseData = {};
      try {
        responseData = await response.json();
      } catch (e) {
        // Ignore JSON parse errors for non-JSON responses
      }

      // Handle rate limiting
      if ((responseData as any)?.error_summary?.includes('too_many_write_operations')) {
        const retryAfter = (responseData as any)?.error?.retry_after;
        const EXTRA_WAIT = 1;

        if (retryAfter) {
          return new Promise((resolve, reject) => {
            setTimeout(
              () => {
                pfLog(
                  2,
                  `Too many requests(${headers['Dropbox-API-Arg']}), retrying in ${retryAfter}s...`,
                );
                this._request({
                  url,
                  method,
                  data,
                  headers,
                  params,
                  isSkipTokenRefresh: true,
                })
                  .then(resolve)
                  .catch(reject);
              },
              (retryAfter + EXTRA_WAIT) * 1000,
            );
          });
        } else {
          throw new TooManyRequestsAPIError(url, headers['Dropbox-API-Arg'], {
            method,
            error: responseData,
            data,
          });
        }
      }

      // Handle missing file errors
      if ((responseData as any)?.error_summary?.includes('path/not_found/')) {
        throw new RemoteFileNotFoundAPIError(
          headers['Dropbox-API-Arg'] ? JSON.parse(headers['Dropbox-API-Arg']).path : url,
          responseData,
        );
      }

      // Throw error data in a format similar to axios for compatibility
      throw {
        status: response.status,
        response: {
          status: response.status,
          data: responseData,
        },
        error_summary: (responseData as any)?.error_summary,
      };
    }

    return response;
  }

  async updateAccessTokenFromRefreshTokenIfAvailable(): Promise<void> {
    pfLog(2, 'updateAccessTokenFromRefreshTokenIfAvailable()');
    const privateCfg = await this._parent.privateCfg.load();
    const refreshToken = privateCfg?.refreshToken;
    if (!refreshToken) {
      console.error('Dropbox: No refresh token available');
      throw new Error('NO_REFRESH_TOKEN');
    }

    const response = await fetch('https://api.dropbox.com/oauth2/token', {
      method: 'POST',
      headers: {
        // 'Content-Type': 'application/x-www-form-urlencoded;charset=UTF-8',
      },
      body: stringify({
        refresh_token: refreshToken,
        grant_type: 'refresh_token',
        client_id: this._appKey,
      }),
    });

    if (!response.ok) {
      throw new Error(`HTTP error! Status: ${response.status}`);
    }

    const data = await response.json();
    pfLog(2, 'Dropbox: Refresh access token Response', data);

    await this._parent.privateCfg.save({
      accessToken: data.access_token,
      refreshToken: data.refresh_token || privateCfg?.refreshToken,
    });
  }

  async getTokensFromAuthCode(
    authCode: string,
    codeVerifier: string,
  ): Promise<{
    accessToken: string;
    refreshToken: string;
    expiresAt: number;
  } | null> {
    const response = await fetch('https://api.dropboxapi.com/oauth2/token', {
      method: 'POST',
      headers: {
        // 'Content-Type': 'application/x-www-form-urlencoded;charset=UTF-8',
      },
      body: stringify({
        code: authCode,
        grant_type: 'authorization_code',
        client_id: this._appKey,
        code_verifier: codeVerifier,
      }),
    });

    if (!response.ok) {
      throw new Error(`HTTP error! Status: ${response.status}`);
    }

    const data = await response.json();

    if (typeof data.access_token !== 'string') {
      console.log(data);
      throw new Error('Dropbox: Invalid access token response');
    }
    if (typeof data.refresh_token !== 'string') {
      console.log(data);
      throw new Error('Dropbox: Invalid refresh token response');
    }
    if (typeof +data.expires_in !== 'number') {
      console.log(data);
      throw new Error('Dropbox: Invalid expiresIn response');
    }

    return {
      accessToken: data.access_token,
      refreshToken: data.refresh_token,
      // eslint-disable-next-line no-mixed-operators
      expiresAt: +data.expires_in * 1000 + Date.now(),
    };
  }

  // async checkUser(accessToken: string): Promise<unknown> {
  //   const response = await this._request({
  //     method: 'POST',
  //     url: 'https://api.dropboxapi.com/2/check/user',
  //     accessToken,
  //   });
  //   return response.json();
  // }
}
