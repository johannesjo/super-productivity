import {Injectable} from '@angular/core';
import * as lz from 'lz-string';

@Injectable({
  providedIn: 'root'
})
export class CompressionService {

  constructor() {
  }

  compress(data: string): string {
    return lz.compress(data);
  }

  decompress(data: string): string {
    return lz.decompress(data);
  }
}
