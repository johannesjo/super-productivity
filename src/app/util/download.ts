import { saveAs } from 'file-saver';

export const download = (filename: string, stringData: string): void => {
  const blob = new Blob([stringData], { type: 'text/plain;charset=utf-8' });
  saveAs(blob, filename);
};
