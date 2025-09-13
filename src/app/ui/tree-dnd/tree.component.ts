import {
  AfterViewInit,
  ChangeDetectionStrategy,
  Component,
  computed,
  DestroyRef,
  ElementRef,
  effect,
  inject,
  input,
  output,
  signal,
  TemplateRef,
  contentChild,
} from '@angular/core';
import { NgTemplateOutlet } from '@angular/common';
import { monitorForElements } from '@atlaskit/pragmatic-drag-and-drop/element/adapter';
import { DropWhere, MoveInstruction, TreeNode } from './tree.types';
import { moveNode } from './tree.utils';
import { DndDraggableDirective } from './dnd-draggable.directive';
import { DndDropTargetDirective } from './dnd-drop-target.directive';
import { asDragData, asDropData } from './dnd.helpers';

@Component({
  selector: 'tree-dnd',
  standalone: true,
  imports: [NgTemplateOutlet, DndDraggableDirective, DndDropTargetDirective],
  templateUrl: './tree.component.html',
  styleUrl: './tree.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class TreeDndComponent implements AfterViewInit {
  private host = inject(ElementRef<HTMLElement>);
  private destroyRef = inject(DestroyRef);

  // Unique context to keep interactions scoped to one tree
  private ctx = Symbol('tree-dnd');
  // expose to template
  contextId = this.ctx;

  // Inputs (signal-based)
  readonly data = input.required<TreeNode[]>();
  readonly indent = input(16);

  // Local state mirrored from input for internal reordering
  readonly nodes = signal<TreeNode[]>([]);
  private _syncEffect = effect(() => {
    this.nodes.set(this.data() ?? []);
  });

  // Content templates (signal-based)
  readonly itemTpl = contentChild<TemplateRef<any>>('treeItem');
  readonly folderTpl = contentChild<TemplateRef<any>>('treeFolder');

  // Output: notify consumers of moves
  moved = output<MoveInstruction>();

  // drag highlight state (ids mapped to where states)
  private overMap = signal<Record<string, Partial<Record<DropWhere, boolean>>>>({});

  setOver(id: string, where: DropWhere, on: boolean) {
    this.overMap.update((m) => {
      const entry = { ...(m[id] ?? {}) };
      entry[where] = on;
      return { ...m, [id]: entry };
    });
  }

  isOver = (id: string, where: DropWhere) =>
    computed(() => !!this.overMap()[id]?.[where]);
  rootOver = signal<boolean>(false);

  draggingId = signal<string | null>(null);
  // trackBy not needed with @for track expressions

  // Indicator state
  indicatorVisible = signal(false);
  indicatorTop = signal(0);
  indicatorLeft = signal(0);
  indicatorWidth = signal(0);

  onIndicator(evt: { active: boolean; element: HTMLElement; where: DropWhere }) {
    if (!evt.active) {
      this.indicatorVisible.set(false);
      return;
    }
    // Only show for before/after/root
    if (evt.where === 'inside') {
      this.indicatorVisible.set(false);
      return;
    }
    const container = this.host.nativeElement.querySelector('.tree') as HTMLElement;
    const containerRect = container.getBoundingClientRect();
    const elRect = evt.element.getBoundingClientRect();

    let y = elRect.top - containerRect.top + (evt.where === 'after' ? elRect.height : 0);
    let left = 0;
    let width = containerRect.width;

    // try align to row content
    const row = evt.element.parentElement?.querySelector(
      '.tree__row',
    ) as HTMLElement | null;
    if (row) {
      const rowRect = row.getBoundingClientRect();
      left = rowRect.left - containerRect.left;
      width = containerRect.width - left;
    }

    this.indicatorTop.set(Math.round(y));
    this.indicatorLeft.set(Math.max(0, Math.round(left)));
    this.indicatorWidth.set(Math.max(0, Math.round(width)));
    this.indicatorVisible.set(true);
  }

  isFolder(n: TreeNode): boolean {
    return !!n.isFolder || n.children !== undefined;
  }

  ngAfterViewInit() {
    const cleanup: Array<() => void> = [];

    // Register monitor only (drop-targets + draggables are directives)
    cleanup.push(
      monitorForElements({
        canMonitor: ({ source }) =>
          asDragData(source.data as any)?.uniqueContextId === this.ctx,
        onDragStart: ({ source }) => {
          const data = asDragData(source.data as any);
          if (data) this.draggingId.set(data.id);
        },
        onDrop: ({ location, source }) => {
          this.draggingId.set(null);
          const dropTargets = location.current.dropTargets;
          if (!dropTargets.length) return;
          const s = asDragData(source.data as any);
          const target = asDropData(dropTargets[0].data as any);
          if (!s || !target) return;
          if (target.where === 'root') {
            const instr: MoveInstruction = {
              itemId: s.id,
              targetId: '',
              where: 'inside',
            };
            this.nodes.set(moveNode(this.nodes(), instr));
            this.moved.emit(instr);
            return;
          }
          if (target.where === 'inside') {
            const targetNode = this.findNode(target.id);
            if (!targetNode || !this.isFolder(targetNode)) {
              return; // disallow dropping inside items
            }
          }
          const instr: MoveInstruction = {
            itemId: s.id,
            targetId: target.id,
            where: target.where,
          } as MoveInstruction;
          this.nodes.set(moveNode(this.nodes(), instr));
          this.moved.emit(instr);
        },
      }),
    );

    this.destroyRef.onDestroy(() => {
      cleanup.forEach((fn) => fn());
    });
  }

  private findNode(id: string): TreeNode | null {
    const stack = [...this.nodes()];
    while (stack.length) {
      const n = stack.pop()!;
      if (n.id === id) return n;
      if (n.children) stack.push(...n.children);
    }
    return null;
  }

  toggle(node: TreeNode) {
    if (!node.children?.length) return;
    node.expanded = !node.expanded;
    // trigger change
    this.nodes.update((list) => [...list]);
  }
}
