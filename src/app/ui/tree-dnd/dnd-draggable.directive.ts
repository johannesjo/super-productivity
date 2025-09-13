import { DestroyRef, Directive, effect, ElementRef, inject, input } from '@angular/core';
import { draggable } from '@atlaskit/pragmatic-drag-and-drop/element/adapter';
import { makeDragData } from './dnd.helpers';

@Directive({
  selector: '[dndDraggable]',
  standalone: true,
})
export class DndDraggableDirective {
  private el = inject(ElementRef<HTMLElement>);
  private destroyRef = inject(DestroyRef);

  // Inputs (signal-based)
  id = input.required<string>({ alias: 'dndDraggable' });
  dndContext = input.required<symbol>();

  private cleanup: (() => void) | null = null;

  private _bindEffect = effect(() => {
    // Rebind when id/context changes
    if (this.cleanup) {
      this.cleanup();
      this.cleanup = null;
    }
    const id = this.id();
    const ctx = this.dndContext();
    this.cleanup = draggable({
      element: this.el.nativeElement,
      getInitialData: () => makeDragData(ctx, id),
    });
  });

  constructor() {
    this.destroyRef.onDestroy(() => this.cleanup?.());
  }
}
