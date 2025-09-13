import type { DragData, DropData } from './tree.types';

type AnyData = Record<string | symbol, unknown>;

export function makeDragData(ctx: symbol, id: string): AnyData {
  const data: DragData = { type: 'item', id, uniqueContextId: ctx };
  return data as unknown as AnyData;
}

export function makeDropData(data: DropData): AnyData {
  return data as unknown as AnyData;
}

export function asDragData(data: unknown): DragData | null {
  if (!data || typeof data !== 'object') return null;
  const d = data as Partial<DragData>;
  return d.type === 'item' &&
    typeof d.id === 'string' &&
    typeof d.uniqueContextId === 'symbol'
    ? ({ type: 'item', id: d.id, uniqueContextId: d.uniqueContextId } as DragData)
    : null;
}

export function asDropData(data: unknown): DropData | null {
  if (!data || typeof data !== 'object') return null;
  const d = data as Partial<DropData>;
  if (d.type !== 'drop' || typeof d.where !== 'string') return null;
  if (d.where === 'root') return { type: 'drop', id: '', where: 'root' };
  if (typeof d.id === 'string')
    return { type: 'drop', id: d.id, where: d.where as DropData['where'] };
  return null;
}
