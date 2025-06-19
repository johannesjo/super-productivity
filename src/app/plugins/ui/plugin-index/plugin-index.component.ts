import {
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  inject,
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
  NotifyCfg,
  DialogCfg,
  PluginCreateTaskData,
  TaskCopy,
  ProjectCopy,
  TagCopy,
} from '../../plugin-api.model';
import { SnackCfg } from '@super-productivity/plugin-api';
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
        this._setupIframeCommunication(pluginId);
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

    // Inject the PluginAPI script directly into the HTML content before the closing </body> tag
    const pluginApiScript = `<script>${this._getPluginApiScript()}</script>`;
    const modifiedContent = indexContent.replace('</body>', `${pluginApiScript}</body>`);

    // Instead of using a blob URL, we'll use a data URL which is more compatible
    // First, we need to ensure the content is properly encoded
    const base64Content = btoa(unescape(encodeURIComponent(modifiedContent)));
    const dataUrl = `data:text/html;charset=utf-8;base64,${base64Content}`;
    const safeUrl = this._sanitizer.bypassSecurityTrustResourceUrl(dataUrl);

    this.iframeSrc.set(safeUrl);
    this.isLoading.set(false);
  }

  private _setupIframeCommunication(pluginId: string): void {
    // Clean up any existing listener first
    this._cleanupIframeCommunication();

    this._messageListener = (event: Event) => {
      // Cast to MessageEvent for typed access
      const messageEvent = event as MessageEvent;
      // Security: Verify origin for data URLs
      // In development, localhost origins are common due to dev server
      const isDevOrigin = messageEvent.origin.startsWith('http://localhost:');
      const isDataUrlOrigin =
        messageEvent.origin === 'null' || messageEvent.origin.startsWith('data:');

      if (!isDataUrlOrigin && !isDevOrigin) {
        console.warn('Received message from unexpected origin:', messageEvent.origin);
        return;
      }

      // Only handle messages from our iframe
      if (
        !this.iframeRef?.nativeElement.contentWindow ||
        messageEvent.source !== this.iframeRef.nativeElement.contentWindow
      ) {
        return;
      }

      // Handle plugin API calls from iframe
      if (
        messageEvent.data &&
        typeof messageEvent.data === 'object' &&
        messageEvent.data.type === 'PLUGIN_API_CALL'
      ) {
        this._handlePluginApiCall(pluginId, messageEvent.data);
      }

      // Handle plugin messages (for plugin-to-plugin communication)
      if (
        messageEvent.data &&
        typeof messageEvent.data === 'object' &&
        messageEvent.data.type === 'PLUGIN_MESSAGE'
      ) {
        this._handlePluginMessage(pluginId, messageEvent.data);
      }
    };

    window.addEventListener('message', this._messageListener);
    // Track the listener for cleanup
    this._cleanupService.registerEventListener(
      pluginId,
      window,
      'message',
      this._messageListener,
    );
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

  private async _handlePluginApiCall(
    pluginId: string,
    message: { method: string; args: unknown[]; callId: string },
  ): Promise<void> {
    // Validate message structure
    if (!message.method || !Array.isArray(message.args) || !message.callId) {
      console.error('Invalid plugin API call structure:', message);
      return;
    }

    try {
      // Set the plugin context for secure API calls
      this._pluginBridge._setCurrentPlugin(pluginId);

      const { method, args, callId } = message;
      let result: unknown;

      // Restricted methods that should not be callable from iframe
      const restrictedMethods = [
        'registerHook',
        'registerHeaderButton',
        'registerMenuEntry',
        'registerShortcut',
        'registerSidePanelButton',
        'onMessage',
        'executeNodeScript',
      ];

      if (restrictedMethods.includes(method)) {
        throw new Error(
          `Method '${method}' is not allowed from iframe context. This method can only be called from the main plugin code.`,
        );
      }

      // Map API method calls to bridge methods
      switch (method) {
        case 'showSnack':
          result = this._pluginBridge.showSnack(args[0] as SnackCfg);
          break;
        case 'notify':
          result = await this._pluginBridge.notify(args[0] as NotifyCfg);
          break;
        case 'openDialog':
          result = await this._pluginBridge.openDialog(args[0] as DialogCfg);
          break;
        case 'getTasks':
          result = await this._pluginBridge.getTasks();
          break;
        case 'getArchivedTasks':
          result = await this._pluginBridge.getArchivedTasks();
          break;
        case 'getCurrentContextTasks':
          result = await this._pluginBridge.getCurrentContextTasks();
          break;
        case 'updateTask':
          result = await this._pluginBridge.updateTask(
            args[0] as string,
            args[1] as Partial<TaskCopy>,
          );
          break;
        case 'addTask':
          result = await this._pluginBridge.addTask(args[0] as PluginCreateTaskData);
          break;
        case 'getAllProjects':
          result = await this._pluginBridge.getAllProjects();
          break;
        case 'addProject':
          result = await this._pluginBridge.addProject(args[0] as Partial<ProjectCopy>);
          break;
        case 'updateProject':
          result = await this._pluginBridge.updateProject(
            args[0] as string,
            args[1] as Partial<ProjectCopy>,
          );
          break;
        case 'getAllTags':
          result = await this._pluginBridge.getAllTags();
          break;
        case 'addTag':
          result = await this._pluginBridge.addTag(args[0] as Partial<TagCopy>);
          break;
        case 'updateTag':
          result = await this._pluginBridge.updateTag(
            args[0] as string,
            args[1] as Partial<TagCopy>,
          );
          break;
        case 'persistDataSynced':
          result = await this._pluginBridge.persistDataSynced(args[0] as string);
          break;
        case 'loadPersistedData':
          result = await this._pluginBridge.loadPersistedData();
          break;
        case 'loadSyncedData':
          // Map loadSyncedData to loadPersistedData
          result = await this._pluginBridge.loadPersistedData();
          break;
        default:
          throw new Error(`Unknown API method: ${method}`);
      }

      // Send result back to iframe with targetOrigin for security
      if (this.iframeRef?.nativeElement.contentWindow) {
        try {
          // For data URLs, we must use '*' as targetOrigin
          this.iframeRef.nativeElement.contentWindow.postMessage(
            {
              type: 'PLUGIN_API_RESPONSE',
              callId,
              result,
            },
            '*', // Data URLs require '*' as targetOrigin
          );
        } catch (e) {
          console.error('Failed to post message to iframe:', e);
        }
      }
    } catch (error) {
      // Send error back to iframe
      console.error(`Plugin API call failed for ${message.method}:`, error);
      if (this.iframeRef?.nativeElement.contentWindow) {
        try {
          this.iframeRef.nativeElement.contentWindow.postMessage(
            {
              type: 'PLUGIN_API_ERROR',
              callId: message.callId,
              error: error instanceof Error ? error.message : 'Unknown error',
            },
            '*', // Data URLs require '*' as targetOrigin
          );
        } catch (e) {
          console.error('Failed to post error message to iframe:', e);
        }
      }
    }
  }

  onIframeLoad(): void {
    // The API is already injected via the data URL, no need to inject again
    console.log('Plugin iframe loaded for plugin:', this.pluginId());
  }

  private async _handlePluginMessage(
    pluginId: string,
    message: { messageId?: string; data: any },
  ): Promise<void> {
    try {
      // Call the plugin's message handler through the runner
      const result = await this._pluginBridge.sendMessageToPlugin(pluginId, message.data);

      // Send response back to iframe if messageId was provided
      if (message.messageId && this.iframeRef?.nativeElement.contentWindow) {
        try {
          this.iframeRef.nativeElement.contentWindow.postMessage(
            {
              type: 'PLUGIN_MESSAGE_RESPONSE',
              messageId: message.messageId,
              result,
            },
            '*',
          );
        } catch (e) {
          console.error('Failed to post plugin message response to iframe:', e);
        }
      }
    } catch (error) {
      console.error(`Plugin message handling failed:`, error);
      // Send error back to iframe if messageId was provided
      if (message.messageId && this.iframeRef?.nativeElement.contentWindow) {
        try {
          this.iframeRef.nativeElement.contentWindow.postMessage(
            {
              type: 'PLUGIN_MESSAGE_RESPONSE',
              messageId: message.messageId,
              error: error instanceof Error ? error.message : 'Unknown error',
            },
            '*',
          );
        } catch (e) {
          console.error('Failed to post plugin error response to iframe:', e);
        }
      }
    }
  }

  private _getPluginApiScript(): string {
    return `
      // Plugin API for iframe communication
      (function() {
        let callId = 0;
        const pendingCalls = new Map();

        // Listen for responses from parent window
        window.addEventListener('message', function(event) {
          if (event.data && event.data.type === 'PLUGIN_API_RESPONSE') {
            const { callId: responseCallId, result } = event.data;
            const resolver = pendingCalls.get(responseCallId);
            if (resolver) {
              pendingCalls.delete(responseCallId);
              resolver.resolve(result);
            }
          } else if (event.data && event.data.type === 'PLUGIN_API_ERROR') {
            const { callId: responseCallId, error } = event.data;
            const resolver = pendingCalls.get(responseCallId);
            if (resolver) {
              pendingCalls.delete(responseCallId);
              resolver.reject(new Error(error));
            }
          }
        });

        function makeApiCall(method, args) {
          return new Promise((resolve, reject) => {
            const currentCallId = ++callId;
            pendingCalls.set(currentCallId, { resolve, reject });

            // Use '*' for data URLs which have null origin
            const targetOrigin = window.location.origin === 'null' ? '*' : window.location.origin;
            window.parent.postMessage({
              type: 'PLUGIN_API_CALL',
              method: method,
              args: args || [],
              callId: currentCallId
            }, targetOrigin);

            // Timeout after 30 seconds
            setTimeout(() => {
              if (pendingCalls.has(currentCallId)) {
                pendingCalls.delete(currentCallId);
                reject(new Error('API call timeout'));
              }
            }, 30000);
          });
        }

        // Expose Plugin API to iframe
        window.PluginAPI = {
          showSnack: (snackCfg) => makeApiCall('showSnack', [snackCfg]),
          notify: (notifyCfg) => makeApiCall('notify', [notifyCfg]),
          openDialog: (dialogCfg) => makeApiCall('openDialog', [dialogCfg]),
          getTasks: () => makeApiCall('getTasks', []),
          getArchivedTasks: () => makeApiCall('getArchivedTasks', []),
          getCurrentContextTasks: () => makeApiCall('getCurrentContextTasks', []),
          updateTask: (taskId, updates) => makeApiCall('updateTask', [taskId, updates]),
          addTask: (taskData) => makeApiCall('addTask', [taskData]),
          getAllProjects: () => makeApiCall('getAllProjects', []),
          addProject: (projectData) => makeApiCall('addProject', [projectData]),
          updateProject: (projectId, updates) => makeApiCall('updateProject', [projectId, updates]),
          getAllTags: () => makeApiCall('getAllTags', []),
          addTag: (tagData) => makeApiCall('addTag', [tagData]),
          updateTag: (tagId, updates) => makeApiCall('updateTag', [tagId, updates]),
          persistDataSynced: (dataStr) => makeApiCall('persistDataSynced', [dataStr]),
          loadPersistedData: () => makeApiCall('loadPersistedData', []),
          loadSyncedData: () => makeApiCall('loadSyncedData', []),
        };

        console.log('Plugin API injected successfully');
      })();
    `;
  }
}
