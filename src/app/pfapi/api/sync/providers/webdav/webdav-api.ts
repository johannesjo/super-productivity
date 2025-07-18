import { WebdavPrivateCfg } from './webdav.model';
import { PFLog } from '../../../../../core/log';
import { IS_ANDROID_WEB_VIEW } from '../../../../../util/is-android-web-view';
import { FileMeta, WebdavXmlParser } from './webdav-xml-parser';

/* eslint-disable @typescript-eslint/naming-convention */

interface WebDavRequestOptions {
  method: string;
  path: string;
  body?: string | null;
  headers?: Record<string, string>;
  ifNoneMatch?: string | null;
}

export class WebdavApi {
  private static readonly L = 'WebdavApi';
  private xmlParser: WebdavXmlParser;

  // Make IS_ANDROID_WEB_VIEW testable by making it a class property
  protected get isAndroidWebView(): boolean {
    return IS_ANDROID_WEB_VIEW;
  }

  constructor(private _getCfgOrError: () => Promise<WebdavPrivateCfg>) {
    this.xmlParser = new WebdavXmlParser((rev: string) => this._cleanRev(rev));
  }

  async getFileMeta(
    path: string,
    localRev: string | null,
    useGetFallback: boolean = false,
  ): Promise<FileMeta> {}

  async download({
    path,
    localRev,
    rangeStart,
    rangeEnd,
  }: {
    path: string;
    localRev?: string | null;
    rangeStart?: number;
    rangeEnd?: number;
  }): Promise<{ rev: string; dataStr: string }> {}

  async remove(path: string, expectedEtag?: string): Promise<void> {}

  private async _makeRequest({
    method,
    path,
    body = null,
    headers = {},
    ifNoneMatch = null,
  }: WebDavRequestOptions): Promise<Response> {}

  private _cleanRev(rev: string): string {
    if (!rev) return '';
    const result = rev
      .replace(/\//g, '')
      .replace(/"/g, '')
      .replace(/&quot;/g, '')
      .trim();
    PFLog.verbose(`${WebdavApi.L}.cleanRev() "${rev}" -> "${result}"`);
    return result;
  }
}
