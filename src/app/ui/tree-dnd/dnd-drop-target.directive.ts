import {
  DestroyRef,
  Directive,
  effect,
  ElementRef,
  inject,
  input,
  output,
} from '@angular/core';
import {
  dropTargetForElements,
  type ElementDropTargetEventBasePayload,
} from '@atlaskit/pragmatic-drag-and-drop/element/adapter';
import type { DropData } from './tree.types';
import { asDragData, makeDropData } from './dnd.helpers';

@Directive({
  selector: '[dndDropTarget]',
  standalone: true,
})
export class DndDropTargetDirective {
  private el = inject(ElementRef<HTMLElement>);
  private destroyRef = inject(DestroyRef);

  // Inputs (modern signal-based)
  config = input<{ id: string; where: DropData['where'] } | null>(null, {
    alias: 'dndDropTarget',
  });
  dndContext = input.required<symbol>();

  // Outputs (modern signal-based)
  activeChange = output<boolean>();
  indicator = output<{
    active: boolean;
    element: HTMLElement;
    where: DropData['where'];
  }>();

  private cleanup: (() => void) | null = null;

  // Rebind drop target whenever config/context changes
  private _bindEffect = effect(() => {
    // ensure cleanup of previous binding
    this.cleanup?.();
    this.cleanup = null;

    const cfg = this.config();
    if (!cfg) {
      return; // disabled target
    }

    const where = cfg.where;
    this.cleanup = dropTargetForElements({
      element: this.el.nativeElement,
      canDrop: ({ source }) =>
        asDragData(source.data as any)?.uniqueContextId === this.dndContext(),
      getData: () => makeDropData({ type: 'drop', id: cfg.id, where }),
      onDragStart: (p) => this.onActive(p, where),
      onDropTargetChange: (p) => this.onActive(p, where),
      onDragLeave: () => {
        this.activeChange.emit(false);
        this.indicator.emit({ active: false, element: this.el.nativeElement, where });
      },
      onDrop: () => {
        this.activeChange.emit(false);
        this.indicator.emit({ active: false, element: this.el.nativeElement, where });
      },
    });
  });

  constructor() {
    this.destroyRef.onDestroy(() => this.cleanup?.());
  }

  private onActive(
    { location, self }: ElementDropTargetEventBasePayload,
    where: DropData['where'],
  ) {
    const [innerMost] = location.current.dropTargets;
    const isActive = innerMost?.element === self.element;
    this.activeChange.emit(isActive);
    this.indicator.emit({ active: isActive, element: this.el.nativeElement, where });
  }
}
