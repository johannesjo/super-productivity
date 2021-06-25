import { Injectable } from '@angular/core';
import { SnackService } from '../snack/snack.service';
import * as shortid from 'shortid';
import { T } from '../../t.const';

@Injectable({ providedIn: 'root' })
export class CompressionService {
  private _w: Worker;
  private _activeInstances: any = {};

  constructor(private readonly _snackService: SnackService) {
    if (typeof (Worker as any) === 'undefined') {
      throw new Error('No web worker support');
    }
    // Create a new
    this._w = new Worker(new URL('./lz.worker', import.meta.url), {
      name: 'lz',
      type: 'module',
    });
    this._w.addEventListener('message', this._onData.bind(this));
    this._w.addEventListener('error', this._handleError.bind(this));
  }

  async compress(strToHandle: string): Promise<string> {
    return this._promisifyWorker({
      type: 'COMPRESS',
      strToHandle,
    });
  }

  async decompress(strToHandle: string): Promise<string> {
    return this._promisifyWorker({
      type: 'DECOMPRESS',
      strToHandle,
    });
  }

  async compressUTF16(strToHandle: string): Promise<string> {
    return this._promisifyWorker({
      type: 'COMPRESS_UTF16',
      strToHandle,
    });
  }

  async decompressUTF16(strToHandle: string): Promise<string> {
    return this._promisifyWorker({
      type: 'DECOMPRESS_UTF16',
      strToHandle,
    });
  }

  private _promisifyWorker(params: {
    type: string;
    strToHandle: string;
  }): Promise<string> {
    const id = shortid();

    const promise = new Promise((resolve, reject) => {
      this._activeInstances[id] = {
        resolve,
        reject,
      };
    }) as Promise<string>;

    this._w.postMessage({
      ...params,
      id,
    });
    return promise;
  }

  private async _onData(msg: MessageEvent) {
    const { id, strToHandle, err } = msg.data;
    if (err) {
      this._activeInstances[id].reject(err);
      this._handleError(err);
    } else {
      this._activeInstances[id].resolve(strToHandle);
    }
    delete this._activeInstances[id];
  }

  private _handleError(err: any) {
    console.error(err);
    this._snackService.open({ type: 'ERROR', msg: T.GLOBAL_SNACK.ERR_COMPRESSION });
  }
}
