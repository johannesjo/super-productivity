import { CapacitorHttp, HttpResponse, registerPlugin } from '@capacitor/core';
import { IS_ANDROID_WEB_VIEW } from '../../../../../util/is-android-web-view';
import { PFLog } from '../../../../../core/log';
import {
  AuthFailSPError,
  HttpNotOkAPIError,
  RemoteFileNotFoundAPIError,
  TooManyRequestsAPIError,
} from '../../../errors/errors';
import { WebDavHttpStatus } from './webdav.const';

// Define and register our WebDAV plugin
interface WebDavHttpPlugin {
  request(options: any): Promise<any>;
}

const WebDavHttp = registerPlugin<WebDavHttpPlugin>('WebDavHttp');

export interface WebDavHttpRequest {
  url: string;
  method: string;
  headers?: Record<string, string>;
  body?: string | null;
}

export interface WebDavHttpResponse {
  status: number;
  headers: Record<string, string>;
  data: string;
}

export class WebDavHttpAdapter {
  private static readonly L = 'WebDavHttpAdapter';
  private static readonly WEBDAV_METHODS = [
    'PROPFIND',
    'MKCOL',
    'MOVE',
    'COPY',
    'LOCK',
    'UNLOCK',
    'PROPPATCH',
  ];

  // Make IS_ANDROID_WEB_VIEW testable by making it a class property
  protected get isAndroidWebView(): boolean {
    return IS_ANDROID_WEB_VIEW;
  }

  async request(options: WebDavHttpRequest): Promise<WebDavHttpResponse> {
    try {
      let response: WebDavHttpResponse;

      if (this.isAndroidWebView) {
        // Check if this is a WebDAV method
        const isWebDavMethod = WebDavHttpAdapter.WEBDAV_METHODS.includes(
          options.method.toUpperCase(),
        );

        if (isWebDavMethod) {
          // Use our custom WebDAV plugin for WebDAV methods
          PFLog.log(
            `${WebDavHttpAdapter.L}.request() using WebDavHttp for ${options.method}`,
          );
          const webdavResponse = await WebDavHttp.request({
            url: options.url,
            method: options.method,
            headers: options.headers,
            data: options.body,
          });
          response = this._convertWebDavResponse(webdavResponse);
        } else {
          // Use standard CapacitorHttp for regular HTTP methods
          const capacitorResponse = await CapacitorHttp.request({
            url: options.url,
            method: options.method,
            headers: options.headers,
            data: options.body,
          });
          response = this._convertCapacitorResponse(capacitorResponse);
        }
      } else {
        // Use fetch for other platforms
        const fetchResponse = await fetch(options.url, {
          method: options.method,
          headers: options.headers,
          body: options.body,
        });

        response = await this._convertFetchResponse(fetchResponse);
      }

      // Check for common HTTP errors
      this._checkHttpStatus(response.status, options.url);

      return response;
    } catch (e) {
      if (
        e instanceof AuthFailSPError ||
        e instanceof HttpNotOkAPIError ||
        e instanceof RemoteFileNotFoundAPIError ||
        e instanceof TooManyRequestsAPIError
      ) {
        throw e;
      }

      PFLog.error(`${WebDavHttpAdapter.L}.request() error`, {
        url: options.url,
        method: options.method,
        error: e,
      });
      // Create a fake Response object for the error
      const errorResponse = new Response('Network error', {
        status: WebDavHttpStatus.INTERNAL_SERVER_ERROR,
        statusText: `Network error: ${e}`,
      });
      throw new HttpNotOkAPIError(errorResponse);
    }
  }

  private _convertCapacitorResponse(response: HttpResponse): WebDavHttpResponse {
    return {
      status: response.status,
      headers: response.headers || {},
      data: response.data || '',
    };
  }

  private _convertWebDavResponse(response: any): WebDavHttpResponse {
    return {
      status: response.status,
      headers: response.headers || {},
      data: response.data || '',
    };
  }

  private async _convertFetchResponse(response: Response): Promise<WebDavHttpResponse> {
    const headers: Record<string, string> = {};
    response.headers.forEach((value, key) => {
      headers[key] = value;
    });

    return {
      status: response.status,
      headers,
      data: await response.text(),
    };
  }

  private _checkHttpStatus(status: number, url: string): void {
    if (status === WebDavHttpStatus.NOT_MODIFIED) {
      // 304 Not Modified is not an error - let it pass through
      return;
    }

    if (status === WebDavHttpStatus.UNAUTHORIZED) {
      throw new AuthFailSPError();
    }

    if (status === WebDavHttpStatus.NOT_FOUND) {
      throw new RemoteFileNotFoundAPIError(url);
    }

    if (status === WebDavHttpStatus.TOO_MANY_REQUESTS) {
      throw new TooManyRequestsAPIError();
    }

    if (status < 200 || status >= 300) {
      // Create a fake Response object for the error
      const errorResponse = new Response('', {
        status: status,
        statusText: `HTTP ${status} for ${url}`,
      });
      throw new HttpNotOkAPIError(errorResponse);
    }
  }
}
