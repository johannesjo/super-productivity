export type DragPreviewContext =
  | { kind: 'time'; timestamp: number }
  | { kind: 'shift'; day: string; isEndOfDay: boolean }
  | { kind: 'override'; label: string }
  | null;
