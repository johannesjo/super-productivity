import {Injectable} from '@angular/core';
import {Observable, of} from 'rxjs';
import {getCacheId} from './get-cache-id';
import {tap} from 'rxjs/operators';

export interface CacheItem {
  r: any;
  e: number;
}

export interface CompleteCache {
  [key: string]: CacheItem;
}

@Injectable({
  providedIn: 'root',
})
export class IssueCacheService {
  dummyCache: CompleteCache = {};

  cache(url: string, requestInit: RequestInit, orgMethod: any, orgArguments: any[], minAlive = 25000): Observable<any> {
    const cacheId = getCacheId(requestInit, url);

    if (this._isUseCache(cacheId) && requestInit.method === 'GET') {
      return of(this._loadFromCache(cacheId));
    } else {
      return orgMethod(...orgArguments).pipe(
        tap((res) => {
          this._saveToCache(cacheId, res, minAlive);
        })
      );
    }
  }

  private _saveToCache(cacheId: string, response: any, minAlive: number) {
    console.log('SAVING CACHE', cacheId);
    const item = {
      e: minAlive ? (Date.now() + minAlive) : null,
      r: response,
    };
    this.dummyCache[cacheId] = item;
  }

  private _loadFromCache(cacheId: string) {
    console.log('LOAD CACHE');
    return this.dummyCache[cacheId].r;
  }

  private _isUseCache(cacheId: string) {
    return false;
    console.log(this.dummyCache[cacheId], Date.now(), !navigator.onLine);
    return this.dummyCache[cacheId] && (this.dummyCache[cacheId].e > Date.now() || !navigator.onLine);
  }

}
