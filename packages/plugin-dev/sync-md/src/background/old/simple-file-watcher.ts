import { PluginFileOperations } from './helper/file-operations';
import { Debouncer } from './helper/debouncer';
import { FileOperations } from './models/file-operations.model';
import { FileWatcherOptions } from './models/file-operations.model';

export class SimpleFileWatcher {
  private fileOps: FileOperations;
  private watchHandle: unknown = null;
  private isWatching: boolean = false;
  private debouncer = new Debouncer();
  private lastSeenModifiedTime: number = 0;

  constructor(private options: FileWatcherOptions) {
    this.fileOps = new PluginFileOperations(PluginAPI);
  }

  /**
   * Start watching the file for changes
   */
  async start(): Promise<void> {
    if (this.isWatching) {
      console.log('📁 File watcher already running');
      return;
    }

    try {
      // Get initial file state
      const stats = await this.fileOps.getFileStats(this.options.filePath);
      this.lastSeenModifiedTime = stats.modifiedTime;

      // Start watching
      this.watchHandle = await this.fileOps.watchFile(this.options.filePath, async () => {
        // Debounce file change events
        this.debouncer.debounce(
          'file-change',
          async () => {
            try {
              const fileStats = await this.fileOps.getFileStats(this.options.filePath);

              // Only trigger if modified time actually changed
              if (fileStats.modifiedTime > this.lastSeenModifiedTime) {
                console.log('📄 File change detected');
                this.lastSeenModifiedTime = fileStats.modifiedTime;
                this.options.onFileChange(fileStats.modifiedTime);
              }
            } catch (error) {
              console.error('Error checking file stats:', error);
              this.options.onError(error as Error);
            }
          },
          500,
        ); // 500ms debounce
      });

      this.isWatching = true;
      console.log('👀 Started watching file:', this.options.filePath);
    } catch (error) {
      console.error('Failed to start file watcher:', error);
      this.options.onError(error as Error);
      throw error;
    }
  }

  /**
   * Stop watching the file
   */
  stop(): void {
    if (!this.isWatching) {
      return;
    }

    if (this.watchHandle && typeof this.watchHandle === 'function') {
      (this.watchHandle as () => void)();
    }

    this.watchHandle = null;
    this.isWatching = false;
    this.debouncer.cancelAll();
    console.log('🛑 Stopped watching file');
  }
}
