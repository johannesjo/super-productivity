/**
 * Models for file operations and watching
 */

export interface FileWatcherOptions {
  filePath: string;
  onFileChange: (modifiedTime: number) => void;
  onError: (error: Error) => void;
}

export interface NodeScriptOptions {
  script: string;
  args: unknown[];
  timeout: number;
}

export interface NodeScriptResult {
  success: boolean;
  result?: unknown;
  error?: string;
}

export interface PluginAPILike {
  executeNodeScript(options: NodeScriptOptions): Promise<NodeScriptResult>;
}
