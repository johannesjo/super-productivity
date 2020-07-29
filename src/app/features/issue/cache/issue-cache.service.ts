import { Injectable } from '@angular/core';
import { Observable, of } from 'rxjs';
import { getCacheId } from './get-cache-id';
import { tap } from 'rxjs/operators';
import { loadFromRealLs, saveToRealLs } from '../../../core/persistence/local-storage';

export interface CacheItem {
  r: any;
  e: number;
}

@Injectable({
  providedIn: 'root',
})
export class IssueCacheService {
  cache(url: string, requestInit: RequestInit, orgMethod: any, orgArguments: any[], minAlive: number = 25000): Observable<any> {
    const cacheId = getCacheId(requestInit, url);

    if (this._isUseCache(cacheId) && requestInit.method === 'GET') {
      return of(this._loadResponseFromCache(cacheId));
    } else {
      return orgMethod(...orgArguments).pipe(
        tap((res) => {
          this._saveToCache(cacheId, res, minAlive);
        })
      );
    }
  }

  private _saveToCache(cacheId: string, response: any, minAlive: number) {
    const item = {
      e: minAlive ? (Date.now() + minAlive) : null,
      r: response,
    };
    saveToRealLs(cacheId, item);
  }

  private _loadResponseFromCache(cacheId: string) {
    const cacheItem = loadFromRealLs(cacheId);
    return cacheItem && cacheItem.r;
  }

  private _loadResponseItemFromCache(cacheId: string): CacheItem {
    return loadFromRealLs(cacheId);
  }

  private _isUseCache(cacheId: string) {
    const item = this._loadResponseItemFromCache(cacheId);
    return item && (item.e > Date.now() || !navigator.onLine);
  }

}
