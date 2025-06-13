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
import { PluginService } from '../../plugin.service';
import { PluginBridgeService } from '../../plugin-bridge.service';
import {
  SnackCfgLimited,
  NotifyCfg,
  DialogCfg,
  PluginCreateTaskData,
  TaskCopy,
  ProjectCopy,
  TagCopy,
} from '../../plugin-api.model';
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
})
export class PluginIndexComponent implements OnInit, OnDestroy {
  @ViewChild('iframe', { static: false }) iframeRef?: ElementRef<HTMLIFrameElement>;

  private readonly _route = inject(ActivatedRoute);
  private readonly _router = inject(Router);
  private readonly _sanitizer = inject(DomSanitizer);
  private readonly _pluginService = inject(PluginService);
  private readonly _pluginBridge = inject(PluginBridgeService);

  readonly pluginId = signal<string>('');
  readonly isLoading = signal<boolean>(true);
  readonly error = signal<string | null>(null);
  readonly iframeSrc = signal<SafeResourceUrl | null>(null);

  private _messageListener?: (event: MessageEvent) => void;

  async ngOnInit(): Promise<void> {
    const pluginId = this._route.snapshot.paramMap.get('pluginId');
    if (!pluginId) {
      this.error.set('Plugin ID not provided');
      this.isLoading.set(false);
      return;
    }

    this.pluginId.set(pluginId);

    try {
      await this._loadPluginIndex(pluginId);
      this._setupIframeCommunication(pluginId);
    } catch (err) {
      console.error('Failed to load plugin index:', err);
      this.error.set(err instanceof Error ? err.message : 'Failed to load plugin');
      this.isLoading.set(false);
    }
  }

  ngOnDestroy(): void {
    this._cleanupIframeCommunication();
  }

  goBack(): void {
    this._router.navigate(['/config'], { fragment: 'plugins' });
  }

  private async _loadPluginIndex(pluginId: string): Promise<void> {
    // Get the plugin index.html content
    const indexContent = await this._pluginService.getPluginIndexHtml(pluginId);
    if (!indexContent) {
      throw new Error('Plugin does not have an index.html file');
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
    this._messageListener = (event: MessageEvent) => {
      // Security: Verify origin for data URLs
      if (event.origin !== 'null' && !event.origin.startsWith('data:')) {
        console.warn('Received message from unexpected origin:', event.origin);
        return;
      }

      // Only handle messages from our iframe
      if (
        !this.iframeRef?.nativeElement.contentWindow ||
        event.source !== this.iframeRef.nativeElement.contentWindow
      ) {
        return;
      }

      // Handle plugin API calls from iframe
      if (
        event.data &&
        typeof event.data === 'object' &&
        event.data.type === 'PLUGIN_API_CALL'
      ) {
        this._handlePluginApiCall(pluginId, event.data);
      }
    };

    window.addEventListener('message', this._messageListener);
  }

  private _cleanupIframeCommunication(): void {
    if (this._messageListener) {
      window.removeEventListener('message', this._messageListener);
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

      // Map API method calls to bridge methods
      switch (method) {
        case 'showSnack':
          result = this._pluginBridge.showSnack(args[0] as SnackCfgLimited);
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
        default:
          throw new Error(`Unknown API method: ${method}`);
      }

      // Send result back to iframe with targetOrigin for security
      if (this.iframeRef?.nativeElement.contentWindow) {
        this.iframeRef.nativeElement.contentWindow.postMessage(
          {
            type: 'PLUGIN_API_RESPONSE',
            callId,
            result,
          },
          '*', // Data URLs require '*' as targetOrigin
        );
      }
    } catch (error) {
      // Send error back to iframe
      console.error(`Plugin API call failed for ${message.method}:`, error);
      if (this.iframeRef?.nativeElement.contentWindow) {
        this.iframeRef.nativeElement.contentWindow.postMessage(
          {
            type: 'PLUGIN_API_ERROR',
            callId: message.callId,
            error: error instanceof Error ? error.message : 'Unknown error',
          },
          '*', // Data URLs require '*' as targetOrigin
        );
      }
    }
  }

  onIframeLoad(): void {
    // The API is already injected via the data URL, no need to inject again
    console.log('Plugin iframe loaded for plugin:', this.pluginId());
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

            window.parent.postMessage({
              type: 'PLUGIN_API_CALL',
              method: method,
              args: args || [],
              callId: currentCallId
            }, '*');

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
        };

        console.log('Plugin API injected successfully');
      })();
    `;
  }
}
