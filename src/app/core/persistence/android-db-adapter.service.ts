import { Injectable } from '@angular/core';
import { androidInterface } from '../android/android-interface';

@Injectable({
  providedIn: 'root',
})
export class AndroidDbAdapterService {
  async init(): Promise<void> {
    return undefined;
  }

  async teardown(): Promise<void> {
    return undefined;
  }

  async load(key: string): Promise<unknown> {
    const data = await androidInterface.loadFromDbWrapped(key);
    return JSON.parse(data as string);
  }

  async save(key: string, data: unknown): Promise<unknown> {
    return await androidInterface.saveToDbWrapped(key, JSON.stringify(data));
  }

  async remove(key: string): Promise<unknown> {
    return await androidInterface.removeFromDbWrapped(key);
  }

  async clearDatabase(): Promise<unknown> {
    return await androidInterface.clearDbWrapped();
  }
}
