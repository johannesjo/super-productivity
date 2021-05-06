import { Injectable } from '@angular/core';
import {
  loadFromRealLs,
  removeFromRealLs,
  saveToRealLs,
} from '../../../core/persistence/local-storage';
import * as moment from 'moment';
import { Duration } from 'moment';

class CacheContent<T> {
  constructor(public expire: Date, public content: T) {}
}

@Injectable({
  providedIn: 'root',
})
export class IssueCacheService {
  async projectCache<T>(
    pId: string,
    type: string,
    expire: Duration,
    fetch: () => Promise<T>,
  ): Promise<T> {
    const key = `SUP_p_${type}_${pId}`;
    let cachedContent: CacheContent<T> = loadFromRealLs(key) as CacheContent<T>;
    if (!cachedContent || moment(cachedContent.expire).isBefore(moment())) {
      cachedContent = new CacheContent<T>(moment().add(expire).toDate(), await fetch());
      saveToRealLs(key, { ...cachedContent });
    }
    const realContent: T = cachedContent.content;
    return realContent;
  }

  async removeProjectCache(pId: string, type: string) {
    const key = `SUP_p_${type}_${pId}`;
    removeFromRealLs(key);
  }
}
