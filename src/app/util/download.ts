import { saveAs } from 'file-saver';
import { Directory, Encoding, Filesystem, WriteFileResult } from '@capacitor/filesystem';
import { IS_ANDROID_WEB_VIEW } from './is-android-web-view';
import { Log } from '../core/log';
// Type definitions for window.ea are in ../core/window-ea.d.ts

const isRunningInSnap = (): boolean => {
  return !!window.ea?.isSnap?.();
};

export const download = async (
  filename: string,
  stringData: string,
): Promise<{ isSnap?: boolean; path?: string }> => {
  if (IS_ANDROID_WEB_VIEW) {
    await saveStringAsFile(filename, stringData);
    return {};
  } else if (isRunningInSnap() && window.ea?.saveFileDialog) {
    // Use native dialog for snap to avoid AppArmor permission issues
    const result = await window.ea.saveFileDialog(filename, stringData);
    if (result.success && result.path) {
      Log.log('File saved to:', result.path);
      return { isSnap: true, path: result.path };
    }
    return { isSnap: true };
  } else {
    const blob = new Blob([stringData], { type: 'text/plain;charset=utf-8' });
    saveAs(blob, filename);
    return {};
  }
};

/**
 * Saves a string content as a file in the app's Documents directory.
 * @param fileName The desired name for the file (e.g., 'my-data.txt', 'report.json').
 * @param content The string content to save.
 */
const saveStringAsFile = async (
  fileName: string,
  content: string,
): Promise<WriteFileResult> => {
  const r = await Filesystem.writeFile({
    path: fileName,
    data: content,
    directory: Directory.Documents,
    encoding: Encoding.UTF8,
    recursive: true,
  });
  Log.log(r);
  return r;
};

// interestingly this can't live in the logs.ts or it leads to weird "window" not found errors
export const downloadLogs = async (): Promise<void> => {
  await download('SP-logs.json', Log.exportLogHistory());
};
