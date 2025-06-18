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
import { Subscription, filter } from 'rxjs';
import { DomSanitizer, SafeResourceUrl } from '@angular/platform-browser';
import {
  createPluginIframeUrl,
  createIframeMessageHandler,
  PluginIframeConfig,
} from '../../util/plugin-iframe.util';
import { CommonModule } from '@angular/common';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';

@Component({
  selector: 'plugin-panel-container',
  standalone: true,
  imports: [CommonModule, MatProgressSpinnerModule],
  template: `
    @if (iframeUrl()) {
      <iframe
        [src]="iframeUrl()"
        class="plugin-iframe"
        sandbox="allow-scripts allow-same-origin allow-popups allow-forms"
        allow="clipboard-read; clipboard-write"
        (load)="onIframeLoad()"
      ></iframe>
    } @else {
      <div class="loading-container">
        <mat-spinner></mat-spinner>
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

      .loading-container {
        display: flex;
        align-items: center;
        justify-content: center;
        height: 100%;
      }
    `,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PluginPanelContainerComponent implements OnInit, OnDestroy {
  private _pluginService = inject(PluginService);
  private _pluginBridge = inject(PluginBridgeService);
  private _sanitizer = inject(DomSanitizer);

  iframeUrl = signal<SafeResourceUrl | null>(null);

  private _subs = new Subscription();
  private _messageHandler?: (event: MessageEvent) => Promise<void>;

  ngOnInit(): void {
    // Subscribe to active side panel plugin changes
    this._subs.add(
      this._pluginService.activeSidePanelPlugin$
        .pipe(filter((plugin) => !!plugin))
        .subscribe(async (plugin) => {
          if (!plugin) return;

          try {
            // Get plugin data
            const baseCfg = await this._pluginService.getBaseCfg();
            const indexHtml = await this._pluginService.loadPluginIndexHtml(plugin.id);

            if (!indexHtml) {
              console.error(`No index.html found for plugin ${plugin.id}`);
              return;
            }

            // Create iframe config
            const config: PluginIframeConfig = {
              pluginId: plugin.id,
              manifest: plugin.manifest,
              indexHtml,
              baseCfg,
              pluginBridge: this._pluginBridge,
            };

            // Create iframe URL
            const url = createPluginIframeUrl(config);
            this.iframeUrl.set(this._sanitizer.bypassSecurityTrustResourceUrl(url));

            // Set up message handler
            if (this._messageHandler) {
              window.removeEventListener('message', this._messageHandler);
            }
            this._messageHandler = createIframeMessageHandler(config);
            window.addEventListener('message', this._messageHandler);
          } catch (error) {
            console.error('Failed to load plugin in side panel:', error);
          }
        }),
    );
  }

  ngOnDestroy(): void {
    this._subs.unsubscribe();
    if (this._messageHandler) {
      window.removeEventListener('message', this._messageHandler);
    }
  }

  onIframeLoad(): void {
    console.log('Plugin iframe loaded in side panel');
  }
}
