import {
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  inject,
  Input,
  OnDestroy,
  OnInit,
  signal,
  ViewChild,
} from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { DomSanitizer, SafeResourceUrl } from '@angular/platform-browser';
import { Subscription } from 'rxjs';
import { trigger, transition, style, animate } from '@angular/animations';
import { PluginService } from '../../plugin.service';
import { PluginBridgeService } from '../../plugin-bridge.service';
import { PluginCleanupService } from '../../plugin-cleanup.service';
import {
  createFullPagePluginConfig,
  createSidePanelPluginConfig,
  createPluginIframeSetup,
} from '../../util/plugin-iframe.util';
import { CommonModule } from '@angular/common';
import { MatButton } from '@angular/material/button';
import { MatIcon } from '@angular/material/icon';
import { MatProgressSpinner } from '@angular/material/progress-spinner';
import {
  MatCard,
  MatCardContent,
  MatCardHeader,
  MatCardTitle,
} from '@angular/material/card';

@Component({
  selector: 'plugin-index',
  templateUrl: './plugin-index.component.html',
  styleUrls: ['./plugin-index.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  standalone: true,
  imports: [
    CommonModule,
    MatButton,
    MatIcon,
    MatProgressSpinner,
    MatCard,
    MatCardContent,
    MatCardHeader,
    MatCardTitle,
  ],
  animations: [
    trigger('pluginSwitch', [
      transition(':enter', [
        style({ opacity: 0, transform: 'translateX(20px)' }),
        animate('300ms ease-in-out', style({ opacity: 1, transform: 'translateX(0)' })),
      ]),
      transition('* => *', [
        style({ opacity: 0, transform: 'translateX(-20px)' }),
        animate('300ms ease-in-out', style({ opacity: 1, transform: 'translateX(0)' })),
      ]),
    ]),
  ],
})
export class PluginIndexComponent implements OnInit, OnDestroy {
  @ViewChild('iframe', { static: false }) iframeRef?: ElementRef<HTMLIFrameElement>;

  // Optional input for direct plugin ID (for embedding in other components)
  @Input() directPluginId?: string;
  // Optional input to hide the back button and header UI
  @Input() showFullUI: boolean = true;
  // Optional input to use side panel configuration instead of full page
  @Input() useSidePanelConfig: boolean = false;

  private readonly _route = inject(ActivatedRoute);
  private readonly _router = inject(Router);
  private readonly _sanitizer = inject(DomSanitizer);
  private readonly _pluginService = inject(PluginService);
  private readonly _pluginBridge = inject(PluginBridgeService);
  private readonly _cleanupService = inject(PluginCleanupService);

  readonly pluginId = signal<string>('');
  readonly isLoading = signal<boolean>(true);
  readonly error = signal<string | null>(null);
  readonly iframeSrc = signal<SafeResourceUrl | null>(null);

  private _messageListener?: EventListener;
  private _routeSubscription?: Subscription;

  async ngOnInit(): Promise<void> {
    // If directPluginId is provided, load that plugin directly
    if (this.directPluginId) {
      this.pluginId.set(this.directPluginId);
      this._cleanupIframeCommunication();
      await this._waitForPluginSystem();

      try {
        await this._loadPluginIndex(this.directPluginId);
      } catch (err) {
        console.error('Failed to load plugin index:', err);
        this.error.set(err instanceof Error ? err.message : 'Failed to load plugin');
        this.isLoading.set(false);
      }
      return;
    }

    // Subscribe to route parameter changes to handle navigation between plugins
    this._routeSubscription = this._route.paramMap.subscribe(async (params) => {
      const pluginId = params.get('pluginId');
      if (!pluginId) {
        this.error.set('Plugin ID not provided');
        this.isLoading.set(false);
        return;
      }

      // Reset state when navigating to a different plugin
      this.isLoading.set(true);
      this.error.set(null);
      this.iframeSrc.set(null);
      this.pluginId.set(pluginId);

      // Clean up previous iframe communication
      this._cleanupIframeCommunication();

      // Wait for plugin system to be initialized
      await this._waitForPluginSystem();

      try {
        await this._loadPluginIndex(pluginId);
      } catch (err) {
        console.error('Failed to load plugin index:', err);
        this.error.set(err instanceof Error ? err.message : 'Failed to load plugin');
        this.isLoading.set(false);
      }
    });
  }

  private async _waitForPluginSystem(): Promise<void> {
    // Wait up to 10 seconds for plugin system initialization
    const maxWaitTime = 10000;
    const checkInterval = 100;
    let waitedTime = 0;

    while (!this._pluginService.isInitialized() && waitedTime < maxWaitTime) {
      await new Promise((resolve) => setTimeout(resolve, checkInterval));
      waitedTime += checkInterval;
    }

    if (!this._pluginService.isInitialized()) {
      throw new Error('Plugin system failed to initialize after 10 seconds');
    }
  }

  ngOnDestroy(): void {
    this._cleanupIframeCommunication();
    if (this._routeSubscription) {
      this._routeSubscription.unsubscribe();
    }
  }

  goBack(): void {
    this._router.navigate(['/config'], { fragment: 'plugins' });
  }

  private async _loadPluginIndex(pluginId: string): Promise<void> {
    // Get the plugin index.html content
    const indexContent = this._pluginService.getPluginIndexHtml(pluginId);
    if (!indexContent) {
      // Try to get the plugin instance to check if it should have an index.html
      const plugins = await this._pluginService.getAllPlugins();
      const plugin = plugins.find((p) => p.manifest.id === pluginId);

      if (!plugin) {
        throw new Error('Plugin not found');
      }

      if (!plugin.manifest.iFrame) {
        throw new Error('Plugin does not support iframe view');
      }

      throw new Error('Plugin index.html not loaded. Please reload the plugin.');
    }

    // Get plugin data for iframe setup
    const plugins = await this._pluginService.getAllPlugins();
    const plugin = plugins.find((p) => p.manifest.id === pluginId);
    if (!plugin) {
      throw new Error('Plugin not found');
    }

    const baseCfg = await this._pluginService.getBaseCfg();

    // Create iframe configuration using the unified utility
    const config = this.useSidePanelConfig
      ? createSidePanelPluginConfig(
          pluginId,
          plugin.manifest,
          indexContent,
          baseCfg,
          this._pluginBridge,
        )
      : createFullPagePluginConfig(
          pluginId,
          plugin.manifest,
          indexContent,
          baseCfg,
          this._pluginBridge,
        );

    // Create iframe setup
    const { iframeUrl, messageHandler } = createPluginIframeSetup(config);

    // Store message handler for cleanup
    this._messageListener = (event: Event) => {
      messageHandler(event as MessageEvent);
    };

    // Set up message communication
    window.addEventListener('message', this._messageListener);
    this._cleanupService.registerEventListener(
      pluginId,
      window,
      'message',
      this._messageListener,
    );

    // Create safe URL and set iframe source
    const safeUrl = this._sanitizer.bypassSecurityTrustResourceUrl(iframeUrl);
    this.iframeSrc.set(safeUrl);
    this.isLoading.set(false);
  }

  private _cleanupIframeCommunication(): void {
    if (this._messageListener) {
      window.removeEventListener('message', this._messageListener);
      this._messageListener = undefined;
    }
    // Clean up tracked resources for the current plugin
    const currentPluginId = this.pluginId();
    if (currentPluginId) {
      this._cleanupService.cleanupPlugin(currentPluginId);
    }
    // Data URLs don't need to be revoked like blob URLs
  }

  onIframeLoad(): void {
    console.log('Plugin iframe loaded for plugin:', this.pluginId());
  }
}
