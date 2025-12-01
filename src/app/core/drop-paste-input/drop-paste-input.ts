import { isImageUrlSimple } from '../../util/is-image-url';
import { DropPasteIcons, DropPasteInput } from './drop-paste.model';

export const createFromDrop = (ev: DragEvent): null | DropPasteInput => {
  if (!ev.dataTransfer) {
    throw new Error('No drop data');
  }
  const text = ev.dataTransfer.getData('text');
  return text ? _createTextBookmark(text) : _createFileBookmark(ev.dataTransfer);
};

export const createFromPaste = (ev: ClipboardEvent): null | DropPasteInput => {
  if (ev.target && (ev.target as HTMLElement).getAttribute('contenteditable')) {
    return null;
  }
  const text = ev.clipboardData && ev.clipboardData.getData('text/plain');
  if (text) {
    return _createTextBookmark(text);
  }
  return null;
};

const _createTextBookmark = (text: string): null | DropPasteInput => {
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
      const isImage = isImageUrlSimple(path);

      return {
        title: _baseName(text),
        path,
        type: isImage ? 'IMG' : 'LINK',
        icon: isImage ? DropPasteIcons.IMG : DropPasteIcons.LINK,
      };
    }
  }
  return null;
};

const _createFileBookmark = (dataTransfer: DataTransfer): null | DropPasteInput => {
  const path =
    dataTransfer.files[0] &&
    ((dataTransfer.files[0] as any).path || dataTransfer.files[0].name);
  if (path) {
    return {
      title: _baseName(path),
      path,
      type: 'FILE',
      icon: DropPasteIcons.FILE,
    };
  }
  return null;
};

const _baseName = (passedStr: string): string => {
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
