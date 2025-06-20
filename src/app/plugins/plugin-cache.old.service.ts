import { Injectable } from '@angular/core';
import {
  compressPlugin,
  decompressPlugin,
  shouldCompress,
  CompressedPlugin,
} from './plugin-compression.util';

export interface CachedPlugin {
  id: string;
  manifest: string;
  code: string;
  indexHtml?: string; // Optional index.html content
  icon?: string; // Optional SVG icon content
  uploadDate: number;
  lastAccessed: number;
  compressed?: boolean; // Whether the plugin is compressed
  compressionRatio?: number; // Compression ratio if compressed
}

/**
 * Simple IndexedDB cache for uploaded plugins
 */
@Injectable({
  providedIn: 'root',
})
export class PluginCacheService {
  private readonly DB_NAME = 'SUPPluginCache';
  private readonly DB_VERSION = 1;
  private readonly STORE_NAME = 'plugins';
  private _db: IDBDatabase | null = null;

  private async _getDB(): Promise<IDBDatabase> {
    if (this._db) {
      return this._db;
    }

    return new Promise((resolve, reject) => {
      const request = indexedDB.open(this.DB_NAME, this.DB_VERSION);

      request.onerror = () => {
        reject(new Error('Failed to open IndexedDB'));
      };

      request.onsuccess = () => {
        this._db = request.result;
        resolve(this._db);
      };

      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result;

        // Create object store if it doesn't exist
        if (!db.objectStoreNames.contains(this.STORE_NAME)) {
          const store = db.createObjectStore(this.STORE_NAME, { keyPath: 'id' });
          store.createIndex('uploadDate', 'uploadDate', { unique: false });
          store.createIndex('lastAccessed', 'lastAccessed', { unique: false });
        }
      };
    });
  }

  /**
   * Store a plugin in the cache with optional compression
   */
  async storePlugin(
    pluginId: string,
    manifest: string,
    code: string,
    indexHtml?: string,
    icon: string | undefined = undefined,
  ): Promise<void> {
    const db = await this._getDB();
    const transaction = db.transaction([this.STORE_NAME], 'readwrite');
    const store = transaction.objectStore(this.STORE_NAME);

    let cachedPlugin: CachedPlugin;

    // Compression disabled for now - complicates things unnecessarily and might have a bad impact on performance
    // TODO: Re-evaluate compression benefits vs complexity/performance tradeoff
    const useCompression = false;

    if (
      useCompression &&
      (shouldCompress(code) || (indexHtml && shouldCompress(indexHtml)))
    ) {
      // Compression code kept but disabled
      try {
        const compressed = await compressPlugin(manifest, code, indexHtml, icon);
        cachedPlugin = {
          id: pluginId,
          manifest: compressed.manifest,
          code: compressed.code,
          indexHtml: compressed.indexHtml,
          icon: compressed.icon,
          uploadDate: Date.now(),
          lastAccessed: Date.now(),
          compressed: true,
          compressionRatio: compressed.compressionRatio,
        };
        console.log(
          `Plugin ${pluginId} compressed with ratio ${compressed.compressionRatio?.toFixed(2)}x`,
        );
      } catch (error) {
        console.warn('Failed to compress plugin, storing uncompressed:', error);
        // Fall back to uncompressed storage
        cachedPlugin = {
          id: pluginId,
          manifest,
          code,
          indexHtml,
          icon,
          uploadDate: Date.now(),
          lastAccessed: Date.now(),
          compressed: false,
        };
      }
    } else {
      // Store uncompressed (default behavior now)
      cachedPlugin = {
        id: pluginId,
        manifest,
        code,
        indexHtml,
        icon,
        uploadDate: Date.now(),
        lastAccessed: Date.now(),
        compressed: false,
      };
    }

    return new Promise((resolve, reject) => {
      const request = store.put(cachedPlugin);

      request.onsuccess = () => {
        console.log(`Plugin ${pluginId} stored in cache`);
        resolve();
      };

      request.onerror = () => {
        reject(new Error(`Failed to store plugin ${pluginId} in cache`));
      };
    });
  }

  /**
   * Retrieve a plugin from the cache and decompress if needed
   */
  async getPlugin(pluginId: string): Promise<CachedPlugin | null> {
    const db = await this._getDB();
    const transaction = db.transaction([this.STORE_NAME], 'readwrite');
    const store = transaction.objectStore(this.STORE_NAME);

    return new Promise((resolve, reject) => {
      const request = store.get(pluginId);

      request.onsuccess = async () => {
        const result = request.result as CachedPlugin | undefined;

        if (result) {
          // Update last accessed time
          result.lastAccessed = Date.now();
          store.put(result);

          // Decompress if needed
          if (result.compressed) {
            try {
              const compressed: CompressedPlugin = {
                manifest: result.manifest,
                code: result.code,
                indexHtml: result.indexHtml,
                icon: result.icon,
                compressed: true,
              };
              const decompressed = await decompressPlugin(compressed);

              // Return decompressed plugin
              const decompressedPlugin: CachedPlugin = {
                ...result,
                manifest: decompressed.manifest,
                code: decompressed.code,
                indexHtml: decompressed.indexHtml,
                icon: decompressed.icon,
              };
              console.log(`Plugin ${pluginId} retrieved and decompressed from cache`);
              resolve(decompressedPlugin);
              return;
            } catch (error) {
              console.error('Failed to decompress plugin:', error);
              reject(new Error(`Failed to decompress plugin ${pluginId}`));
              return;
            }
          }

          console.log(`Plugin ${pluginId} retrieved from cache`);
        }

        resolve(result || null);
      };

      request.onerror = () => {
        reject(new Error(`Failed to retrieve plugin ${pluginId} from cache`));
      };
    });
  }

  /**
   * Check if a plugin exists in the cache
   */
  async hasPlugin(pluginId: string): Promise<boolean> {
    try {
      const plugin = await this.getPlugin(pluginId);
      return plugin !== null;
    } catch (error) {
      console.error(`Error checking cache for plugin ${pluginId}:`, error);
      return false;
    }
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

      request.onsuccess = () => {
        console.log(`Plugin ${pluginId} removed from cache`);
        resolve();
      };

      request.onerror = () => {
        reject(new Error(`Failed to remove plugin ${pluginId} from cache`));
      };
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

      request.onsuccess = () => {
        resolve(request.result as CachedPlugin[]);
      };

      request.onerror = () => {
        reject(new Error('Failed to retrieve all plugins from cache'));
      };
    });
  }

  /**
   * Clear all cached plugins
   */
  async clearCache(): Promise<void> {
    const db = await this._getDB();
    const transaction = db.transaction([this.STORE_NAME], 'readwrite');
    const store = transaction.objectStore(this.STORE_NAME);

    return new Promise((resolve, reject) => {
      const request = store.clear();

      request.onsuccess = () => {
        console.log('Plugin cache cleared');
        resolve();
      };

      request.onerror = () => {
        reject(new Error('Failed to clear plugin cache'));
      };
    });
  }

  /**
   * Clean up old plugins (older than 30 days and not accessed in 7 days)
   */
  async cleanupOldPlugins(): Promise<void> {
    try {
      const allPlugins = await this.getAllPlugins();
      const now = Date.now();
      // eslint-disable-next-line no-mixed-operators
      const thirtyDaysAgo = now - 30 * 24 * 60 * 60 * 1000;
      // eslint-disable-next-line no-mixed-operators
      const sevenDaysAgo = now - 7 * 24 * 60 * 60 * 1000;

      const pluginsToRemove = allPlugins.filter(
        (plugin) =>
          plugin.uploadDate < thirtyDaysAgo && plugin.lastAccessed < sevenDaysAgo,
      );

      for (const plugin of pluginsToRemove) {
        await this.removePlugin(plugin.id);
      }

      if (pluginsToRemove.length > 0) {
        console.log(`Cleaned up ${pluginsToRemove.length} old plugins from cache`);
      }
    } catch (error) {
      console.error('Failed to cleanup old plugins:', error);
    }
  }
}
