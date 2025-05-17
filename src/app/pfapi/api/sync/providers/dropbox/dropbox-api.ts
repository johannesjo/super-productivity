/* eslint-disable @typescript-eslint/naming-convention */

import { stringify } from 'query-string';
import { DropboxFileMetadata } from '../../../../../imex/sync/dropbox/dropbox.model';
import {
  AuthFailSPError,
  HttpNotOkAPIError,
  InvalidDataSPError,
  MissingCredentialsSPError,
  MissingRefreshTokenAPIError,
  NoRevAPIError,
  RemoteFileNotFoundAPIError,
  TooManyRequestsAPIError,
} from '../../../errors/errors';
import { pfLog } from '../../../util/log';
import { SyncProviderServiceInterface } from '../../sync-provider.interface';
import { SyncProviderId } from '../../../pfapi.const';

interface DropboxApiOptions {
  method: HttpMethod;
  url: string;
  headers?: Record<string, any>;
  data?: string | Record<string, unknown>;
  params?: Record<string, string>;
  accessToken?: string;
  isSkipTokenRefresh?: boolean;
}

interface TokenResponse {
  access_token: string;
  refresh_token: string;
  expires_in: number;
}

type HttpMethod = 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH' | 'HEAD' | 'OPTIONS';

/**
 * API class for Dropbox integration
 */
export class DropboxApi {
  private static readonly L = 'DropboxApi';

  constructor(
    private _appKey: string,
    private _parent: SyncProviderServiceInterface<SyncProviderId.Dropbox>,
  ) {}

  // ==============================
  // File Operations
  // ==============================

  /**
   * Retrieve metadata for a file or folder
   */
  async getMetaData(path: string, localRev: string): Promise<DropboxFileMetadata> {
    try {
      const response = await this._request({
        method: 'POST',
        url: 'https://api.dropboxapi.com/2/files/get_metadata',
        headers: {
          'Content-Type': 'application/json',
          ...(localRev ? { 'If-None-Match': localRev } : {}),
        },
        data: { path },
      });
      return response.json();
    } catch (e) {
      pfLog(0, `${DropboxApi.L}.getMetaData() error for path: ${path}`, e);
      this._checkCommonErrors(e, path);
      throw e;
    }
  }

  /**
   * Download a file from Dropbox
   */
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
          'Content-Type': 'application/octet-stream',
          ...(localRev ? { 'If-None-Match': localRev } : {}),
        },
      });

      const apiResult = response.headers.get('dropbox-api-result');
      if (!apiResult) {
        throw new InvalidDataSPError('Missing dropbox-api-result header');
      }

      const meta = JSON.parse(apiResult);
      const data = await response.text();

      if (!meta.rev) {
        throw new NoRevAPIError();
      }

      return { meta, data: data as unknown as T };
    } catch (e) {
      pfLog(0, `${DropboxApi.L}.download() error for path: ${path}`, e);
      this._checkCommonErrors(e, path);
      throw e;
    }
  }

  /**
   * Upload a file to Dropbox
   */
  async upload({
    path,
    revToMatch,
    data,
    isForceOverwrite = false,
  }: {
    path: string;
    revToMatch?: string | null;
    data: any;
    isForceOverwrite?: boolean;
  }): Promise<DropboxFileMetadata> {
    const args = {
      mode: { '.tag': 'overwrite' },
      path,
      mute: true,
    };

    if (!isForceOverwrite) {
      args.mode = revToMatch
        ? ({ '.tag': 'update', update: revToMatch } as any)
        : { '.tag': 'update', update: '01630c96b4d421c00000001ce2a2770' };
    }

    try {
      const response = await this._request({
        method: 'POST',
        url: 'https://content.dropboxapi.com/2/files/upload',
        data,
        headers: {
          'Content-Type': 'application/octet-stream',
          'Dropbox-API-Arg': JSON.stringify(args),
        },
      });

      const result = await response.json();

      if (!result.rev) {
        throw new NoRevAPIError();
      }

      return result;
    } catch (e) {
      pfLog(0, `${DropboxApi.L}.upload() error for path: ${path}`, e);
      this._checkCommonErrors(e, path);
      throw e;
    }
  }

  /**
   * Delete a file from Dropbox
   */
  async remove(path: string): Promise<unknown> {
    try {
      const response = await this._request({
        method: 'POST',
        url: 'https://api.dropboxapi.com/2/files/delete_v2',
        headers: { 'Content-Type': 'application/json' },
        data: { path },
      });
      return response.json();
    } catch (e) {
      pfLog(0, `${DropboxApi.L}.remove() error for path: ${path}`, e);
      this._checkCommonErrors(e, path);
      throw e;
    }
  }

  // ==============================
  // Authentication Methods
  // ==============================

  /**
   * Check user authentication status
   */
  async checkUser(accessToken: string): Promise<unknown> {
    try {
      const response = await this._request({
        method: 'POST',
        url: 'https://api.dropboxapi.com/2/check/user',
        headers: { 'Content-Type': 'application/json' },
        accessToken,
      });
      return response.json();
    } catch (e) {
      pfLog(0, `${DropboxApi.L}.checkUser() error`, e);
      this._checkCommonErrors(e, 'check/user');
      throw e;
    }
  }

  /**
   * Refresh access token using refresh token
   */
  async updateAccessTokenFromRefreshTokenIfAvailable(): Promise<void> {
    pfLog(2, `${DropboxApi.L}.updateAccessTokenFromRefreshTokenIfAvailable()`);

    const privateCfg = await this._parent.privateCfg.load();
    const refreshToken = privateCfg?.refreshToken;

    if (!refreshToken) {
      pfLog(0, 'Dropbox: No refresh token available');
      throw new MissingRefreshTokenAPIError();
    }

    try {
      const response = await fetch('https://api.dropbox.com/oauth2/token', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded;charset=UTF-8',
        },
        body: stringify({
          refresh_token: refreshToken,
          grant_type: 'refresh_token',
          client_id: this._appKey,
        }),
      });

      if (!response.ok) {
        throw new HttpNotOkAPIError(response);
      }

      const data = (await response.json()) as TokenResponse;
      pfLog(2, 'Dropbox: Refresh access token Response', data);

      await this._parent.privateCfg.save({
        accessToken: data.access_token,
        refreshToken: data.refresh_token || privateCfg?.refreshToken,
      });
    } catch (e) {
      pfLog(0, 'Failed to refresh Dropbox access token', e);
      throw e;
    }
  }

  /**
   * Get access and refresh tokens from authorization code
   */
  async getTokensFromAuthCode(
    authCode: string,
    codeVerifier: string,
  ): Promise<{
    accessToken: string;
    refreshToken: string;
    expiresAt: number;
  } | null> {
    try {
      const response = await fetch('https://api.dropboxapi.com/oauth2/token', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded;charset=UTF-8',
        },
        body: stringify({
          code: authCode,
          grant_type: 'authorization_code',
          client_id: this._appKey,
          code_verifier: codeVerifier,
        }),
      });

      if (!response.ok) {
        throw new HttpNotOkAPIError(response);
      }

      const data = (await response.json()) as TokenResponse;

      // Validate response data
      if (typeof data.access_token !== 'string') {
        throw new Error('Dropbox: Invalid access token response');
      }
      if (typeof data.refresh_token !== 'string') {
        throw new Error('Dropbox: Invalid refresh token response');
      }
      if (typeof +data.expires_in !== 'number') {
        throw new Error('Dropbox: Invalid expiresIn response');
      }

      return {
        accessToken: data.access_token,
        refreshToken: data.refresh_token,
        // eslint-disable-next-line no-mixed-operators
        expiresAt: +data.expires_in * 1000 + Date.now(),
      };
    } catch (e) {
      pfLog(0, `${DropboxApi.L}.getTokensFromAuthCode() error`, e);
      throw e;
    }
  }

  // ==============================
  // Core Request Logic
  // ==============================

  /**
   * Make an authenticated request to the Dropbox API
   */
  async _request(options: DropboxApiOptions): Promise<Response> {
    const {
      url,
      method = 'GET',
      data,
      headers = {},
      params,
      accessToken,
      isSkipTokenRefresh = false,
    } = options;

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
    const requestHeaders: Record<string, string> = {
      Authorization: `Bearer ${token}`,
      ...headers,
    };

    // Set default content-type for JSON requests if not explicitly disabled or set
    if (
      requestHeaders['Content-Type'] === undefined &&
      data &&
      typeof data !== 'string' &&
      !requestHeaders['Dropbox-API-Arg']
    ) {
      requestHeaders['Content-Type'] = 'application/json';
    }

    const requestOptions: RequestInit = {
      method,
      headers: requestHeaders,
    };

    // Add request body if data is present
    if (data !== undefined) {
      requestOptions.body = typeof data === 'string' ? data : JSON.stringify(data);
    }

    try {
      const response = await fetch(requestUrl, requestOptions);

      // Handle token refresh
      if (response.status === 401 && !isSkipTokenRefresh) {
        await this.updateAccessTokenFromRefreshTokenIfAvailable();
        return this._request({
          ...options,
          isSkipTokenRefresh: true,
        });
      }

      // Handle errors
      if (!response.ok) {
        const path = headers['Dropbox-API-Arg']
          ? JSON.parse(headers['Dropbox-API-Arg']).path
          : 'unknown';

        await this._handleErrorResponse(response, requestHeaders, path, () =>
          this._request({
            ...options,
            isSkipTokenRefresh: true,
          }),
        );
      }

      return response;
    } catch (e) {
      pfLog(0, `${DropboxApi.L}._request() error for ${url}`, e);
      this._checkCommonErrors(e, url);
      throw e;
    }
  }

  /**
   * Handle error responses from the API
   */
  private async _handleErrorResponse(
    response: Response,
    headers: Record<string, any>,
    path: string,
    originalRequestExecutor: () => Promise<any>,
  ): Promise<never> {
    let responseData = {};
    try {
      responseData = await response.json();
    } catch (e) {
      // Ignore JSON parse errors for non-JSON responses
    }

    // Handle rate limiting
    if ((responseData as any)?.error_summary?.includes('too_many_write_operations')) {
      const retryAfter = (responseData as any)?.error?.retry_after;
      if (retryAfter) {
        return this._handleRateLimit(retryAfter, path, originalRequestExecutor);
      }
      throw new TooManyRequestsAPIError({ response, headers, responseData });
    }

    // Handle specific error cases
    if ((responseData as any)?.error_summary?.includes('path/not_found/')) {
      throw new RemoteFileNotFoundAPIError(path, responseData);
    }

    if (response.status === 401) {
      if (
        (responseData as any)?.error_summary?.includes('expired_access_token') ||
        (responseData as any)?.error_summary?.includes('invalid_access_token')
      ) {
        throw new AuthFailSPError('Dropbox token expired or invalid', '', responseData);
      }
      throw new AuthFailSPError(`Dropbox ${response.status}`, '', responseData);
    }

    if (!response.ok) {
      throw new HttpNotOkAPIError(response);
    }

    // Throw formatted error for consistency
    throw {
      status: response.status,
      response: {
        status: response.status,
        data: responseData,
      },
      error_summary: (responseData as any)?.error_summary,
    };
  }

  /**
   * Handle rate limiting by waiting and retrying
   */
  private _handleRateLimit(
    retryAfter: number,
    path: string,
    originalRequestExecutor: () => Promise<any>,
  ): Promise<never> {
    const EXTRA_WAIT = 1;
    return new Promise((resolve, reject) => {
      setTimeout(
        () => {
          pfLog(2, `Too many requests ${path}, retrying in ${retryAfter}s...`);
          originalRequestExecutor().then(resolve).catch(reject);
        },
        (retryAfter + EXTRA_WAIT) * 1000,
      );
    });
  }

  /**
   * Check for common API errors and convert to appropriate custom errors
   */
  private _checkCommonErrors(e: any, targetPath: string): void {
    if (
      e instanceof RemoteFileNotFoundAPIError ||
      e instanceof AuthFailSPError ||
      e instanceof NoRevAPIError ||
      e instanceof TooManyRequestsAPIError
    ) {
      return;
    }

    if (e?.status === 401) {
      throw new AuthFailSPError(`Dropbox ${e.status}`, targetPath);
    }

    if (e?.error_summary?.includes('path/not_found/')) {
      throw new RemoteFileNotFoundAPIError(targetPath);
    }
  }
}
