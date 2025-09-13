import type { DragData, DropData } from './tree.types';

type AnyData = Record<string | symbol, unknown>;

export function makeDragData(ctx: symbol, id: string): AnyData {
  const data: DragData = { type: 'item', id, uniqueContextId: ctx };
  return data as unknown as AnyData;
}

export function makeDropData(data: DropData): AnyData {
  return data as unknown as AnyData;
}

export function asDragData(data: AnyData | null | undefined): DragData | null {
  if (!data) return null;
  const d = data as unknown as Partial<DragData>;
  return d &&
    d.type === 'item' &&
    typeof d.id === 'string' &&
    typeof d.uniqueContextId === 'symbol'
    ? (d as DragData)
    : null;
}

export function asDropData(data: AnyData | null | undefined): DropData | null {
  if (!data) return null;
  const d = data as unknown as Partial<DropData>;
  if (!d || d.type !== 'drop' || typeof d.where !== 'string') return null;
  if (d.where === 'root') return { type: 'drop', id: '', where: 'root' };
  if (typeof d.id === 'string')
    return { type: 'drop', id: d.id, where: d.where as DropData['where'] };
  return null;
}
