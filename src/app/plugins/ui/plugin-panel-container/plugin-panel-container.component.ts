import {
  ChangeDetectionStrategy,
  Component,
  inject,
  OnDestroy,
  OnInit,
  signal,
} from '@angular/core';
import { PluginService } from '../../plugin.service';
import { PluginBridgeService } from '../../plugin-bridge.service';
import { PluginCleanupService } from '../../plugin-cleanup.service';
import { Subscription } from 'rxjs';
import { filter } from 'rxjs/operators';
import { DomSanitizer, SafeResourceUrl } from '@angular/platform-browser';
import {
  createPluginIframeUrl,
  createIframeMessageHandler,
  PluginIframeConfig,
} from '../../util/plugin-iframe.util';
import { PluginInstance } from '../../plugin-api.model';
import { CommonModule } from '@angular/common';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatIcon } from '@angular/material/icon';

/**
 * Container component for rendering plugin iframes in the right panel.
 * Handles plugin loading, error states, and message communication.
 */
@Component({
  selector: 'plugin-panel-container',
  standalone: true,
  imports: [CommonModule, MatProgressSpinnerModule, MatIcon],
  template: `
    @if (error()) {
      <div class="error-container">
        <mat-icon>error_outline</mat-icon>
        <p>{{ error() }}</p>
      </div>
    } @else if (iframeUrl()) {
      <iframe
        [src]="iframeUrl()"
        class="plugin-iframe"
        sandbox="allow-scripts allow-same-origin allow-popups allow-forms"
        allow="clipboard-read; clipboard-write"
        (load)="onIframeLoad()"
        (error)="onIframeError($event)"
      ></iframe>
    } @else if (isLoading()) {
      <div class="loading-container">
        <mat-spinner></mat-spinner>
        <p>Loading plugin...</p>
      </div>
    }
  `,
  styles: [
    `
      :host {
        display: block;
        height: 100%;
        width: 100%;
        position: relative;
      }

      .plugin-iframe {
        width: 100%;
        height: 100%;
        border: none;
      }

      .loading-container,
      .error-container {
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        height: 100%;
        gap: 16px;
      }

      .error-container {
        color: var(--warn-color, #f44336);
      }

      .error-container mat-icon {
        font-size: 48px;
        width: 48px;
        height: 48px;
      }

      .loading-container p,
      .error-container p {
        margin: 0;
        opacity: 0.7;
      }
    `,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PluginPanelContainerComponent implements OnInit, OnDestroy {
  private _pluginService = inject(PluginService);
  private _pluginBridge = inject(PluginBridgeService);
  private _sanitizer = inject(DomSanitizer);
  private _cleanupService = inject(PluginCleanupService);

  iframeUrl = signal<SafeResourceUrl | null>(null);
  isLoading = signal<boolean>(true);
  error = signal<string | null>(null);

  private _subs = new Subscription();
  private _messageHandler?: EventListener;

  ngOnInit(): void {
    // Subscribe to active side panel plugin changes
    this._subs.add(
      this._pluginService.activeSidePanelPlugin$
        .pipe(filter((plugin): plugin is PluginInstance => !!plugin))
        .subscribe(async (plugin) => {
          if (!plugin) return;

          // Reset state
          this.isLoading.set(true);
          this.error.set(null);
          this.iframeUrl.set(null);

          try {
            // Clean up previous handler
            if (this._messageHandler) {
              window.removeEventListener('message', this._messageHandler);
              this._messageHandler = undefined;
            }

            // Get plugin data
            const baseCfg = await this._pluginService.getBaseCfg();
            const indexHtml = await this._pluginService.loadPluginIndexHtml(
              plugin.manifest.id,
            );

            if (!indexHtml) {
              throw new Error(`No index.html found for plugin ${plugin.manifest.name}`);
            }

            // Create iframe config
            const config: PluginIframeConfig = {
              pluginId: plugin.manifest.id,
              manifest: plugin.manifest,
              indexHtml,
              baseCfg,
              pluginBridge: this._pluginBridge,
            };

            // Create iframe URL
            const url = createPluginIframeUrl(config);
            this.iframeUrl.set(this._sanitizer.bypassSecurityTrustResourceUrl(url));

            // Set up message handler
            const handler = createIframeMessageHandler(config);
            this._messageHandler = (event: Event) => {
              handler(event as MessageEvent);
            };
            window.addEventListener('message', this._messageHandler);
            // Track the listener for cleanup
            this._cleanupService.registerEventListener(
              plugin.manifest.id,
              window,
              'message',
              this._messageHandler,
            );
          } catch (error) {
            console.error('Failed to load plugin in side panel:', error);
            this.error.set(
              error instanceof Error ? error.message : 'Failed to load plugin',
            );
            this.isLoading.set(false);
          }
        }),
    );
  }

  /**
   * Clean up resources for the current plugin
   */
  private _cleanupCurrentPlugin(): void {
    // Remove message handler
    if (this._messageHandler) {
      window.removeEventListener('message', this._messageHandler);
      this._messageHandler = undefined;
    }

    // Clear iframe URL to release resources
    const currentPlugin = this._pluginService.getActiveSidePanelPluginId();
    if (currentPlugin && this.iframeUrl()) {
      // Note: The actual iframe element cleanup is handled by the cleanup service
      // when the plugin is unloaded
      this.iframeUrl.set(null);
    }
  }

  ngOnDestroy(): void {
    this._subs.unsubscribe();
    this._cleanupCurrentPlugin();
  }

  onIframeLoad(): void {
    console.log('Plugin iframe loaded in side panel');
    this.isLoading.set(false);
  }

  onIframeError(event: Event): void {
    console.error('Plugin iframe error:', event);
    this.error.set('Failed to load plugin content');
    this.isLoading.set(false);
  }
}
