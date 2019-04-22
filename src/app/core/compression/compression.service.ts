import {Injectable} from '@angular/core';
import {SnackService} from '../snack/snack.service';
import shortid from 'shortid';

const WORKER_PATH = 'assets/web-workers/lz.js';

@Injectable({
  providedIn: 'root'
})
export class CompressionService {
  private _w: Worker;
  private _activeInstances = {};

  constructor(
    private readonly _snackService: SnackService,
  ) {
    if ('Worker' in window) {
      this._w = new Worker(WORKER_PATH);

      this._w.addEventListener('message', this._onData.bind(this));
      this._w.addEventListener('error', this._handleError.bind(this));
    } else {
      console.error('No web workers supported :(');
    }
  }

  async compress(strToHandle: string): Promise<string> {
    return this._promisifyWorker({
      type: 'COMPRESS',
      strToHandle
    });
  }

  async decompress(strToHandle: string): Promise<string> {
    return this._promisifyWorker({
      type: 'DECOMPRESS',
      strToHandle
    });
  }

  async compressUTF16(strToHandle: string): Promise<string> {
    return this._promisifyWorker({
      type: 'COMPRESS_UTF16',
      strToHandle
    });
  }

  async decompressUTF16(strToHandle: string): Promise<string> {
    return this._promisifyWorker({
      type: 'DECOMPRESS_UTF16',
      strToHandle
    });
  }

  private _promisifyWorker(strToHandle): Promise<string> {
    const id = shortid();

    const promise = new Promise(((resolve, reject) => {
      this._activeInstances[id] = {
        resolve,
        reject,
      };
    })) as Promise<string>;

    this._w.postMessage({
      ...strToHandle,
      id,
    });
    return promise;
  }

  private async _onData(msg: MessageEvent) {
    const {id, strToHandle, err} = msg.data;
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
    this._snackService.open({type: 'ERROR', msg: 'Error for compression interface'});
  }
}
