export type DropPasteInputType = 'FILE' | 'LINK' | 'IMG' | 'COMMAND' | 'NOTE';

export interface DropPasteInput {
  title: string;
  type: DropPasteInputType;
  path: string;
  icon: string;
}

export enum DropPasteIcons {
  FILE = 'insert_drive_file',
  LINK = 'bookmark',
  IMG = 'image',
  COMMAND = 'laptop_windows',
  NOTE = 'note',
}


export const createFromDrop = (ev): null | DropPasteInput => {
  const text = ev.dataTransfer.getData('text');
  return text
    ? (_createTextBookmark(text))
    : (_createFileBookmark(ev.dataTransfer));
};


export const createFromPaste = (ev): null | DropPasteInput => {
  if (ev.target.getAttribute('contenteditable')) {
    return;
  }
  const text = ev.clipboardData.getData('text/plain');
  if (text) {
    return _createTextBookmark(text);
  }
  return null;
};


const _createTextBookmark = (text): null | DropPasteInput => {
  if (text) {
    if (text.match(/\n/)) {
      // addItem({
      //  title: text.substr(0, MAX_TITLE_LENGTH),
      //  type: 'TEXT'
      // });
    } else {
      let path = text;
      if (!path.match(/^http/)) {
        path = '//' + path;
      }
      const isImage = (path.match(/png$|jpg$|jpeg$/i));

      return {
        title: _baseName(text),
        path: path,
        type: isImage ? 'IMG' : 'LINK',
        icon: isImage ? DropPasteIcons.IMG : DropPasteIcons.LINK,
      };
    }
  }
  return null;
};

const _createFileBookmark = (dataTransfer): null | DropPasteInput => {
  const path = dataTransfer.files[0] && dataTransfer.files[0].path;
  if (path) {
    return {
      title: _baseName(path),
      path: path,
      type: 'FILE',
      icon: DropPasteIcons.FILE,
    };
  }
  return null;
};

const _baseName = (passedStr) => {
  const str = passedStr.trim();
  let base;
  if (str[str.length - 1] === '/') {
    const strippedStr = str.substring(0, str.length - 2);
    base = strippedStr.substring(strippedStr.lastIndexOf('/') + 1);
  } else {
    base = str.substring(str.lastIndexOf('/') + 1);
  }

  if (base.lastIndexOf('.') !== -1) {
    base = base.substring(0, base.lastIndexOf('.'));
  }
  return base;
};
