import { nanoid } from 'nanoid';
import { inject, Injectable } from '@angular/core';
import { SnackService } from '../snack/snack.service';
import { T } from '../../t.const';

@Injectable({ providedIn: 'root' })
export class CompressionService {
  private readonly _snackService = inject(SnackService);

  private _w: Worker;
  private _activeInstances: any = {};

  constructor() {
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

  async compressUTF16(strToHandle: string): Promise<string> {
    return this._promisifyWorker({
      type: 'COMPRESS',
      strToHandle,
    });
    // return strFromU8(compressSync(strToU8(strToHandle)), true);
  }

  async decompressUTF16(strToHandle: string): Promise<string> {
    return this._promisifyWorker({
      type: 'DECOMPRESS',
      strToHandle,
    }).catch((err) => {
      console.error(err);
      // TODO remove this fallback
      return this.decompressUTF16Legacy(strToHandle);
    });
    // const decompressed = decompressSync(strToU8(strToHandle, true));
    // const origText = strFromU8(decompressed);
    // return origText;
  }

  async decompressUTF16Legacy(strToHandle: string): Promise<string> {
    return this._promisifyWorker({
      type: 'DECOMPRESS_UTF16',
      strToHandle,
    });
  }

  private _promisifyWorker(params: {
    type: string;
    strToHandle: string;
  }): Promise<string> {
    const id = nanoid();

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

  private async _onData(msg: MessageEvent): Promise<void> {
    const { id, strToHandle, err } = msg.data;
    if (err) {
      this._activeInstances[id].reject(err);
      this._handleError(err);
    } else {
      this._activeInstances[id].resolve(strToHandle);
    }
    delete this._activeInstances[id];
  }

  private _handleError(err: any): void {
    console.error(err);
    this._snackService.open({ type: 'ERROR', msg: T.GLOBAL_SNACK.ERR_COMPRESSION });
  }
}
