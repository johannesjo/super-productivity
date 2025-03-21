// import { createClient } from 'webdav/web';
import { createClient } from 'webdav';
import { WebdavCredentials } from './webdav';
import { FileStat } from 'webdav/dist/node/types';

export class WebdavApi {
  private _getCfgOrError: () => Promise<WebdavCredentials>;

  constructor(_getCfgOrError: () => Promise<WebdavCredentials>) {
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
    return {
      rev: r.headers.etag,
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
}
