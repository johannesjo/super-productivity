import { saveAs } from 'file-saver';

export function download(filename: string, stringData: string) {
  const blob = new Blob([stringData], {type: 'text/plain;charset=utf-8'});
  saveAs(blob, filename);
}
