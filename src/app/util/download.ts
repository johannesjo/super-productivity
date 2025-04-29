import { saveAs } from 'file-saver';
import { Directory, Encoding, Filesystem, WriteFileResult } from '@capacitor/filesystem';
import { IS_ANDROID_WEB_VIEW } from './is-android-web-view';

export const download = (filename: string, stringData: string): void => {
  const blob = new Blob([stringData], { type: 'text/plain;charset=utf-8' });
  if (IS_ANDROID_WEB_VIEW) {
    saveStringAsFile(filename, stringData);
  } else {
    saveAs(blob, filename);
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
  console.log(r);
  return r;
};
