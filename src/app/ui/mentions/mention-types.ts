// Type definitions for mention functionality

export interface MentionItem {
  [key: string]: string | number | boolean | null | undefined;
}

export interface MentionEvent extends Partial<Event> {
  keyCode?: number;
  key?: string;
  which?: number;
  shiftKey?: boolean;
  metaKey?: boolean;
  altKey?: boolean;
  ctrlKey?: boolean;
  isComposing?: boolean;
  data?: string;
  wasClick?: boolean;
  inputEvent?: boolean;
  preventDefault?(): void;
  stopPropagation?(): void;
  stopImmediatePropagation?(): void;
}

export interface CaretPositionNode extends Node {
  anchorNode: Node | null;
  getRangeAt(index: number): Range;
  rangeCount: number;
}

export interface MentionSelection {
  anchorNode: Node | null;
}

// Type for the startNode which can be either a text node or element
export type MentionNode = Node | Element | null;

// Utility type for HTML elements that can contain text
export type TextInputElement = HTMLInputElement | HTMLTextAreaElement;
