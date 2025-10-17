export type DragPreviewContext =
  | { kind: 'time'; timestamp: number }
  | { kind: 'shift-column'; day: string; isEndOfDay: boolean }
  | { kind: 'shift-task'; taskId: string }
  | { kind: 'unschedule'; label: string }
  | null;
