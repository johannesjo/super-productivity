// import { createClient } from 'webdav/web';
import { createClient } from 'webdav';
import { Webdav, WebdavPrivateCfg } from './webdav';
import { FileStat, Headers } from 'webdav/dist/node/types';
import { NoEtagError } from '../../../errors/errors';
import { pfLog } from '../../../util/log';

export class WebdavApi {
  private _getCfgOrError: () => Promise<WebdavPrivateCfg>;

  constructor(_getCfgOrError: () => Promise<WebdavPrivateCfg>) {
    this._getCfgOrError = _getCfgOrError;
  }

  async upload({
    data,
    path,
    isOverwrite,
  }: {
    data: string;
    path: string;
    isOverwrite?: boolean;
  }): Promise<void> {
    const client = await this._createClient();
    // await client.putFileContents(path, data, {
    //   contentLength: false,
    //   details: true,
    //   overwrite: isOverwrite,
    //   transformResponse: (a) => {
    //     console.log('3333', { a });
    //     return a;
    //   },
    // }),
    console.log(path, { isOverwrite, data });

    await client.customRequest(path, {
      headers: {
        // eslint-disable-next-line @typescript-eslint/naming-convention
        'Content-Type': 'application/octet-stream',
        // eslint-disable-next-line @typescript-eslint/naming-convention
        ...(isOverwrite ? {} : { 'If-None-Match': '*' }),
      },
      method: 'PUT',
      data,
    });

    // console.log(await r.text());
    // console.log(r.headers);
    // console.log(r.headers.entries());
    // console.log(r.headers.values());
    // console.log('XXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX', r, r.headers);
  }

  async createFolder({ folderPath }: { folderPath: string }): Promise<void> {
    const client = await this._createClient();

    await client.createDirectory(folderPath, {
      recursive: true,
      details: true,
    });
  }

  async getFileMeta(path: string): Promise<FileStat> {
    const client = await this._createClient();
    const stat = await client.stat(path, { details: true });
    return stat;
    // const r = await client.customRequest(path, {
    //   method: 'HEAD',
    //   details: true,
    // });
    // // TODO transform stream response properly
    // console.log(await r.text());
    // console.log('NEEEEEEEEEEEEEEEEEEEEEEEETA', { r });
    // return r.headers;
    // }
  }

  async download({
    path,
    localRev,
  }: {
    path: string;
    localRev?: string | null;
  }): Promise<{ rev: string; dataStr: string }> {
    const client = await this._createClient();
    const r = await client.getFileContents(path, { format: 'text', details: true });
    console.log('HEADERS', r.headers, r);

    return {
      rev: this.getRevFromMeta(r.headers),
      dataStr: r.data as string,
    };
  }

  async remove(filePath: string): Promise<void> {
    const client = await this._createClient();
    return await client.deleteFile(filePath);
  }

  private async _createClient(): Promise<any> {
    const cfg = await this._getCfgOrError();
    return createClient(cfg.baseUrl, {
      username: cfg.userName,
      password: cfg.password,
    });
  }

  getRevFromMeta(fileMeta: FileStat | Headers): string {
    const d = (fileMeta as any)?.data || fileMeta;
    let etagVal = d?.etag;
    if (typeof etagVal !== 'string') {
      const eTagAlternatives = ['oc-etag', 'last-modified'];
      const propToUseInstead = eTagAlternatives.find((alt) => alt in d);
      console.warn('No etag for WebDAV, using instead: ', propToUseInstead, {
        d,
        propToUseInstead,
        etag: d.etag,
        // eslint-disable-next-line @typescript-eslint/naming-convention
        'oc-etag': d['oc-etag'],
        // eslint-disable-next-line @typescript-eslint/naming-convention
        'last-modified': d['last-modified'],
      });
      if (!propToUseInstead || !d[propToUseInstead]) {
        throw new NoEtagError(fileMeta);
      }
      etagVal = d[propToUseInstead];
    }

    return this._cleanRev(etagVal);
  }

  private _cleanRev(rev: string): string {
    const result = rev
      //
      .replace(/\//g, '')
      .replace(/"/g, '');

    pfLog(3, `${Webdav.name}.${this._cleanRev.name}()`, result);
    return result;
  }
}
