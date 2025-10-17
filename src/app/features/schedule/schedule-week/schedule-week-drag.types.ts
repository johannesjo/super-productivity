export type DragPreviewContext =
  | { kind: 'time'; timestamp: number }
  | { kind: 'shift'; day: string; isEndOfDay: boolean }
  | { kind: 'unschedule'; label: string }
  | null;
