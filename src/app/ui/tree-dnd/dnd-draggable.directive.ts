import {
  DestroyRef,
  Directive,
  effect,
  ElementRef,
  inject,
  input,
  TemplateRef,
  ViewContainerRef,
} from '@angular/core';
import { draggable } from '@atlaskit/pragmatic-drag-and-drop/element/adapter';
import { setCustomNativeDragPreview } from '@atlaskit/pragmatic-drag-and-drop/element/set-custom-native-drag-preview';
import { pointerOutsideOfPreview } from '@atlaskit/pragmatic-drag-and-drop/element/pointer-outside-of-preview';
import { makeDragData } from './dnd.helpers';

@Directive({
  selector: '[dndDraggable]',
  standalone: true,
})
export class DndDraggableDirective {
  private el = inject(ElementRef<HTMLElement>);
  private destroyRef = inject(DestroyRef);
  private vcr = inject(ViewContainerRef);

  // Inputs (signal-based)
  id = input.required<string>({ alias: 'dndDraggable' });
  dndContext = input.required<symbol>();
  dragPreviewTemplate = input<TemplateRef<any> | null>(null);
  dragPreviewData = input<any>(null);

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
      onGenerateDragPreview: ({ nativeSetDragImage }) => {
        setCustomNativeDragPreview({
          getOffset: pointerOutsideOfPreview({
            x: '8px',
            y: '8px',
          }),
          nativeSetDragImage,
          render: ({ container }) => {
            const template = this.dragPreviewTemplate();

            if (template) {
              // Use custom template
              return this.renderCustomTemplate(template, container);
            } else {
              // Fall back to default preview
              return this.renderDefaultPreview(container);
            }
          },
        });
      },
    });
  });

  constructor() {
    this.destroyRef.onDestroy(() => this.cleanup?.());
  }

  private renderCustomTemplate(
    template: TemplateRef<any>,
    container: HTMLElement,
  ): () => void {
    // Create embedded view from the template
    const context = {
      $implicit: this.dragPreviewData(),
      id: this.id(),
      element: this.el.nativeElement,
    };

    const embeddedView = this.vcr.createEmbeddedView(template, context);

    // Add the rendered template nodes to the container
    embeddedView.rootNodes.forEach((node) => {
      if (node.nodeType === Node.ELEMENT_NODE) {
        container.appendChild(node);
      }
    });

    // Manually trigger change detection to ensure the view is properly rendered
    embeddedView.detectChanges();

    return () => {
      embeddedView.destroy();
    };
  }

  private renderDefaultPreview(container: HTMLElement): () => void {
    // Create a clean preview with just the item's text content
    const preview = document.createElement('div');
    preview.style.cssText = `
      background: var(--background-color, #ffffff);
      border: 1px solid var(--border-color, #ddd);
      border-radius: 4px;
      padding: 8px 12px;
      font-family: inherit;
      font-size: inherit;
      color: var(--text-color, #333);
      white-space: nowrap;
      box-shadow: 0 2px 8px rgba(0,0,0,0.15);
      max-width: 300px;
      overflow: hidden;
      text-overflow: ellipsis;
    `;

    // Get the text content of the dragged item
    const textElement = this.el.nativeElement.querySelector('.nav-label, .label, span');
    const text =
      textElement?.textContent?.trim() ||
      this.el.nativeElement.textContent?.trim() ||
      'Item';

    preview.textContent = text;
    container.appendChild(preview);

    return () => {
      preview.remove();
    };
  }
}
