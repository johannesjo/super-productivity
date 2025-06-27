import { Injectable } from '@angular/core';

export interface CachedPlugin {
  id: string;
  manifest: string;
  code: string;
  indexHtml?: string;
  icon?: string;
  uploadDate: number;
}

/**
 * Simplified plugin cache service following KISS principles.
 * Just store and retrieve plugins - no compression, no complex cleanup.
 */
@Injectable({
  providedIn: 'root',
})
export class PluginCacheService {
  private readonly DB_NAME = 'SUPPluginCache';
  private readonly STORE_NAME = 'plugins';
  private _db: IDBDatabase | null = null;

  private async _getDB(): Promise<IDBDatabase> {
    if (this._db) {
      return this._db;
    }

    return new Promise((resolve, reject) => {
      const request = indexedDB.open(this.DB_NAME, 1);

      request.onsuccess = () => {
        this._db = request.result;
        resolve(this._db);
      };

      request.onerror = () => reject(new Error('Failed to open IndexedDB'));

      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result;
        if (!db.objectStoreNames.contains(this.STORE_NAME)) {
          db.createObjectStore(this.STORE_NAME, { keyPath: 'id' });
        }
      };
    });
  }

  /**
   * Store a plugin in the cache - simple and direct
   */
  async storePlugin(
    pluginId: string,
    manifest: string,
    code: string,
    indexHtml?: string,
    icon?: string,
  ): Promise<void> {
    const db = await this._getDB();
    const transaction = db.transaction([this.STORE_NAME], 'readwrite');
    const store = transaction.objectStore(this.STORE_NAME);

    const plugin: CachedPlugin = {
      id: pluginId,
      manifest,
      code,
      indexHtml,
      icon,
      uploadDate: Date.now(),
    };

    return new Promise((resolve, reject) => {
      const request = store.put(plugin);
      request.onsuccess = () => resolve();
      request.onerror = () => reject(new Error(`Failed to store plugin ${pluginId}`));
    });
  }

  /**
   * Get a plugin from the cache
   */
  async getPlugin(pluginId: string): Promise<CachedPlugin | null> {
    const db = await this._getDB();
    const transaction = db.transaction([this.STORE_NAME], 'readonly');
    const store = transaction.objectStore(this.STORE_NAME);

    return new Promise((resolve, reject) => {
      const request = store.get(pluginId);
      request.onsuccess = () => resolve(request.result || null);
      request.onerror = () => reject(new Error(`Failed to get plugin ${pluginId}`));
    });
  }

  /**
   * Remove a plugin from the cache
   */
  async removePlugin(pluginId: string): Promise<void> {
    const db = await this._getDB();
    const transaction = db.transaction([this.STORE_NAME], 'readwrite');
    const store = transaction.objectStore(this.STORE_NAME);

    return new Promise((resolve, reject) => {
      const request = store.delete(pluginId);
      request.onsuccess = () => resolve();
      request.onerror = () => reject(new Error(`Failed to remove plugin ${pluginId}`));
    });
  }

  /**
   * Get all cached plugins
   */
  async getAllPlugins(): Promise<CachedPlugin[]> {
    const db = await this._getDB();
    const transaction = db.transaction([this.STORE_NAME], 'readonly');
    const store = transaction.objectStore(this.STORE_NAME);

    return new Promise((resolve, reject) => {
      const request = store.getAll();
      request.onsuccess = () => resolve(request.result as CachedPlugin[]);
      request.onerror = () => reject(new Error('Failed to get all plugins'));
    });
  }

  /**
   * Clear all plugins
   */
  async clearCache(): Promise<void> {
    const db = await this._getDB();
    const transaction = db.transaction([this.STORE_NAME], 'readwrite');
    const store = transaction.objectStore(this.STORE_NAME);

    return new Promise((resolve, reject) => {
      const request = store.clear();
      request.onsuccess = () => resolve();
      request.onerror = () => reject(new Error('Failed to clear cache'));
    });
  }
}
