import { CapacitorHttp, HttpResponse } from '@capacitor/core';
import { IS_ANDROID_WEB_VIEW } from '../../../../../util/is-android-web-view';
import { PFLog } from '../../../../../core/log';
import {
  AuthFailSPError,
  HttpNotOkAPIError,
  RemoteFileNotFoundAPIError,
  TooManyRequestsAPIError,
} from '../../../errors/errors';

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

  // Make IS_ANDROID_WEB_VIEW testable by making it a class property
  protected get isAndroidWebView(): boolean {
    return IS_ANDROID_WEB_VIEW;
  }

  async request(options: WebDavHttpRequest): Promise<WebDavHttpResponse> {
    try {
      let response: WebDavHttpResponse;

      if (this.isAndroidWebView) {
        // Use CapacitorHttp for Android WebView
        const capacitorResponse = await CapacitorHttp.request({
          url: options.url,
          method: options.method,
          headers: options.headers,
          data: options.body,
        });

        response = this._convertCapacitorResponse(capacitorResponse);
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
      if (e instanceof AuthFailSPError || e instanceof HttpNotOkAPIError) {
        throw e;
      }

      PFLog.error(`${WebDavHttpAdapter.L}.request() error`, {
        url: options.url,
        method: options.method,
        error: e,
      });
      // Create a fake Response object for the error
      const errorResponse = new Response(null, {
        status: 0,
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
    if (status === 401) {
      throw new AuthFailSPError();
    }

    if (status === 404) {
      throw new RemoteFileNotFoundAPIError(url);
    }

    if (status === 429) {
      throw new TooManyRequestsAPIError();
    }

    if (status < 200 || status >= 300) {
      // Create a fake Response object for the error
      const errorResponse = new Response(null, {
        status: status,
        statusText: `HTTP ${status} for ${url}`,
      });
      throw new HttpNotOkAPIError(errorResponse);
    }
  }
}
