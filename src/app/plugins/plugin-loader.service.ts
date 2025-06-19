import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { BehaviorSubject, Observable, of } from 'rxjs';
import { shareReplay, first } from 'rxjs/operators';
import { PluginManifest } from './plugin-api.model';
import { PluginCacheService } from './plugin-cache.service';
import { MAX_PLUGIN_CODE_SIZE, MAX_PLUGIN_MANIFEST_SIZE } from './plugin.const';
import { validatePluginManifest } from './util/validate-manifest.util';

interface PluginLoadState {
  id: string;
  isLoading: boolean;
  isLoaded: boolean;
  error?: string;
}

interface PluginAssets {
  manifest: PluginManifest;
  code: string;
  indexHtml?: string;
  icon?: string;
}

/**
 * Service responsible for lazy loading plugin assets
 * Implements caching and compression support
 */
@Injectable({
  providedIn: 'root',
})
export class PluginLoaderService {
  private readonly _http = inject(HttpClient);
  private readonly _cacheService = inject(PluginCacheService);

  // Track loading state for each plugin
  private readonly _loadStates = new Map<string, BehaviorSubject<PluginLoadState>>();

  // Cache loaded plugin assets in memory
  private readonly _assetCache = new Map<string, Observable<PluginAssets>>();

  // Track which plugins should be loaded on demand vs preloaded
  private readonly _preloadList = new Set<string>([
    // Core plugins that should be preloaded
    'assets/example-plugin',
    'assets/yesterday-tasks-plugin',
  ]);

  /**
   * Check if a plugin should be preloaded
   */
  shouldPreload(pluginPath: string): boolean {
    return this._preloadList.has(pluginPath);
  }

  /**
   * Lazy load plugin assets
   */
  async loadPluginAssets(pluginPath: string): Promise<PluginAssets> {
    // Check if already cached
    if (this._assetCache.has(pluginPath)) {
      return this._assetCache.get(pluginPath)!.pipe(first()).toPromise();
    }

    // Create a shared observable for this load operation
    const load$ = this._createLoadObservable(pluginPath).pipe(
      shareReplay(1), // Cache the result
    );

    this._assetCache.set(pluginPath, load$);
    return load$.pipe(first()).toPromise();
  }

  /**
   * Load plugin assets from an uploaded plugin
   */
  async loadUploadedPluginAssets(pluginId: string): Promise<PluginAssets> {
    const cacheKey = `uploaded://${pluginId}`;

    // Check memory cache first
    if (this._assetCache.has(cacheKey)) {
      return this._assetCache.get(cacheKey)!.pipe(first()).toPromise();
    }

    const cachedPlugin = await this._cacheService.getPlugin(pluginId);
    if (!cachedPlugin) {
      throw new Error(`Cached plugin ${pluginId} not found`);
    }

    const manifest: PluginManifest = JSON.parse(cachedPlugin.manifest);
    const assets: PluginAssets = {
      manifest,
      code: cachedPlugin.code,
      indexHtml: cachedPlugin.indexHtml,
      icon: cachedPlugin.icon,
    };

    // Cache in memory
    this._assetCache.set(cacheKey, of(assets));
    return assets;
  }

  /**
   * Preload critical plugins
   */
  async preloadPlugins(pluginPaths: string[]): Promise<void> {
    const preloadPromises = pluginPaths
      .filter((path) => this.shouldPreload(path))
      .map((path) =>
        this.loadPluginAssets(path).catch((err) =>
          console.error(`Failed to preload ${path}:`, err),
        ),
      );

    await Promise.allSettled(preloadPromises);
  }

  /**
   * Clear memory cache for a specific plugin
   */
  clearCache(pluginPath: string): void {
    this._assetCache.delete(pluginPath);
    const state = this._loadStates.get(pluginPath);
    if (state) {
      state.next({
        id: pluginPath,
        isLoading: false,
        isLoaded: false,
      });
    }
  }

  /**
   * Clear all memory caches
   */
  clearAllCaches(): void {
    this._assetCache.clear();
    this._loadStates.clear();
  }

  /**
   * Create the load observable for a plugin
   */
  private _createLoadObservable(pluginPath: string): Observable<PluginAssets> {
    const state = this._getOrCreateLoadState(pluginPath);

    return new Observable<PluginAssets>((observer) => {
      // Update loading state
      state.next({
        id: pluginPath,
        isLoading: true,
        isLoaded: false,
      });

      // Load manifest first
      this._loadManifest(pluginPath)
        .then(async (manifest) => {
          // Validate manifest
          const validation = validatePluginManifest(manifest);
          if (!validation.isValid) {
            throw new Error(`Invalid plugin manifest: ${validation.errors.join(', ')}`);
          }

          // Load plugin code
          const code = await this._loadPluginCode(pluginPath);

          // Load optional assets
          const indexHtml = manifest.iFrame
            ? await this._loadIndexHtml(pluginPath).catch(() => undefined)
            : undefined;

          const icon = manifest.icon
            ? await this._loadIcon(pluginPath, manifest.icon).catch(() => undefined)
            : undefined;

          const assets: PluginAssets = {
            manifest,
            code,
            indexHtml,
            icon,
          };

          // Update state to loaded
          state.next({
            id: pluginPath,
            isLoading: false,
            isLoaded: true,
          });

          observer.next(assets);
          observer.complete();
        })
        .catch((error) => {
          const errorMsg =
            error instanceof Error ? error.message : 'Failed to load plugin';

          // Update state with error
          state.next({
            id: pluginPath,
            isLoading: false,
            isLoaded: false,
            error: errorMsg,
          });

          observer.error(new Error(errorMsg));
        });
    });
  }

  /**
   * Load plugin manifest
   */
  private async _loadManifest(pluginPath: string): Promise<PluginManifest> {
    const url = `${pluginPath}/manifest.json`;
    const response = await this._http
      .get(url, {
        responseType: 'text',
        headers: {
          Accept: 'application/json',
          // eslint-disable-next-line @typescript-eslint/naming-convention
          'cache-control': 'max-age=3600', // Cache for 1 hour
        },
      })
      .pipe(first())
      .toPromise();

    if (!response) {
      throw new Error('Empty manifest response');
    }

    // Check size
    const size = new Blob([response]).size;
    if (size > MAX_PLUGIN_MANIFEST_SIZE) {
      throw new Error(
        `Manifest too large: ${(size / 1024).toFixed(1)}KB (max: ${(MAX_PLUGIN_MANIFEST_SIZE / 1024).toFixed(1)}KB)`,
      );
    }

    return JSON.parse(response);
  }

  /**
   * Load plugin code
   */
  private async _loadPluginCode(pluginPath: string): Promise<string> {
    const url = `${pluginPath}/plugin.js`;
    const response = await this._http
      .get(url, {
        responseType: 'text',
        headers: {
          Accept: 'application/javascript, text/javascript',
          // eslint-disable-next-line @typescript-eslint/naming-convention
          'cache-control': 'max-age=3600', // Cache for 1 hour
        },
      })
      .pipe(first())
      .toPromise();

    if (!response) {
      throw new Error('Empty plugin code response');
    }

    // Check size
    const size = new Blob([response]).size;
    if (size > MAX_PLUGIN_CODE_SIZE) {
      throw new Error(
        `Plugin code too large: ${(size / 1024 / 1024).toFixed(1)}MB (max: ${(MAX_PLUGIN_CODE_SIZE / 1024 / 1024).toFixed(1)}MB)`,
      );
    }

    return response;
  }

  /**
   * Load plugin index.html
   */
  private async _loadIndexHtml(pluginPath: string): Promise<string> {
    const url = `${pluginPath}/index.html`;
    const html = await this._http
      .get(url, {
        responseType: 'text',
        headers: {
          Accept: 'text/html',
          // eslint-disable-next-line @typescript-eslint/naming-convention
          'cache-control': 'max-age=3600', // Cache for 1 hour
        },
      })
      .pipe(first())
      .toPromise();

    // Process HTML to inline external scripts
    return this._processHtmlWithInlineScripts(html, pluginPath);
  }

  /**
   * Process HTML to inline external script references
   */
  private async _processHtmlWithInlineScripts(
    html: string,
    pluginPath: string,
  ): Promise<string> {
    // Find all script tags with src attributes
    const scriptPattern = /<script\s+[^>]*src=["']([^"']+)["'][^>]*><\/script>/gi;
    const matches = [...html.matchAll(scriptPattern)];

    let processedHtml = html;

    for (const match of matches) {
      const [fullMatch, scriptSrc] = match;

      // Skip if it's an absolute URL or data URL
      if (scriptSrc.startsWith('http') || scriptSrc.startsWith('data:')) {
        continue;
      }

      try {
        // Load the script content
        const scriptUrl = `${pluginPath}/${scriptSrc}`;
        const scriptContent = await this._http
          .get(scriptUrl, { responseType: 'text' })
          .pipe(first())
          .toPromise();

        // Replace the external script tag with inline script
        const inlineScript = `<script>\n${scriptContent}\n</script>`;
        processedHtml = processedHtml.replace(fullMatch, inlineScript);
      } catch (error) {
        console.warn(`Failed to load script ${scriptSrc} for plugin:`, error);
        // Keep the original script tag if loading fails
      }
    }

    return processedHtml;
  }

  /**
   * Load plugin icon
   */
  private async _loadIcon(pluginPath: string, iconFile: string): Promise<string> {
    const url = `${pluginPath}/${iconFile}`;
    return this._http
      .get(url, {
        responseType: 'text',
        headers: {
          Accept: 'image/svg+xml',
          // eslint-disable-next-line @typescript-eslint/naming-convention
          'cache-control': 'max-age=3600', // Cache for 1 hour
        },
      })
      .pipe(first())
      .toPromise();
  }

  /**
   * Get or create load state for a plugin
   */
  private _getOrCreateLoadState(pluginPath: string): BehaviorSubject<PluginLoadState> {
    if (!this._loadStates.has(pluginPath)) {
      this._loadStates.set(
        pluginPath,
        new BehaviorSubject<PluginLoadState>({
          id: pluginPath,
          isLoading: false,
          isLoaded: false,
        }),
      );
    }
    return this._loadStates.get(pluginPath)!;
  }
}
