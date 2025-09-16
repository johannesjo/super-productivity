import {
  AfterViewInit,
  ChangeDetectionStrategy,
  Component,
  contentChild,
  DestroyRef,
  effect,
  ElementRef,
  inject,
  input,
  output,
  signal,
  TemplateRef,
} from '@angular/core';
import { trigger, state, style, transition, animate } from '@angular/animations';
import { NgTemplateOutlet } from '@angular/common';
import { monitorForElements } from '@atlaskit/pragmatic-drag-and-drop/element/adapter';
import {
  DragData,
  DropData,
  DropWhere,
  FolderTplContext,
  ItemTplContext,
  MoveInstruction,
  TreeNode,
} from './tree.types';
import { moveNode } from './tree.utils';
import { DndDraggableDirective } from './dnd-draggable.directive';
import { DndDropTargetDirective } from './dnd-drop-target.directive';
import { asDragData, asDropData } from './dnd.helpers';

@Component({
  selector: 'tree-dnd',
  standalone: true,
  imports: [NgTemplateOutlet, DndDraggableDirective, DndDropTargetDirective],
  templateUrl: './tree.component.html',
  styleUrls: ['./tree.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  animations: [
    trigger('expandCollapse', [
      state(
        'collapsed',
        style({
          height: '0',
          opacity: 0,
          overflow: 'hidden',
        }),
      ),
      state(
        'expanded',
        style({
          height: '*',
          opacity: 1,
          overflow: 'visible',
        }),
      ),
      transition('collapsed <=> expanded', [
        style({ overflow: 'hidden' }),
        animate('300ms ease-in-out'),
      ]),
    ]),
  ],
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
  // Allow users to control drop permission (default: allow all valid moves)
  readonly canDrop = input<
    (ctx: { drag: TreeNode; drop: TreeNode | null; where: DropWhere }) => boolean
  >(() => true);

  // Local state mirrored from input for internal reordering
  readonly nodes = signal<TreeNode[]>([]);
  private nodeCache = signal<Map<string, TreeNode>>(new Map());

  private _syncEffect = effect(() => {
    const newNodes = this.data() ?? [];
    this.nodes.set(newNodes);
    this.rebuildNodeCache(newNodes);
  });

  // Content templates (signal-based)
  readonly itemTpl = contentChild<TemplateRef<ItemTplContext>>('treeItem');
  readonly folderTpl = contentChild<TemplateRef<FolderTplContext>>('treeFolder');
  readonly dragPreviewTpl = contentChild<TemplateRef<any>>('treeDragPreview');

  // Output: notify consumers of moves
  moved = output<MoveInstruction>();
  // Output: emit latest tree after internal changes
  updated = output<TreeNode[]>();

  // drag highlight state (ids mapped to where states)
  private overMap = signal<Record<string, Partial<Record<DropWhere, boolean>>>>({});

  setOver(id: string, where: DropWhere, on: boolean): void {
    // Track hover state
    this.overMap.update((m) => {
      const entry = { ...(m[id] ?? {}) };
      entry[where] = on;
      return { ...m, [id]: entry };
    });
  }

  isOver(id: string, where: DropWhere): boolean {
    return !!this.overMap()[id]?.[where];
  }
  rootOver = signal<boolean>(false);

  draggingId = signal<string | null>(null);
  // recent drop flash state
  justDroppedId = signal<string | null>(null);
  private _dropFlashTimer?: number;
  // trackBy not needed with @for track expressions

  // Indicator state
  indicatorVisible = signal(false);
  indicatorTop = signal(0);
  indicatorLeft = signal(0);
  indicatorWidth = signal(0);

  onIndicator(evt: { active: boolean; element: HTMLElement; where: DropWhere }): void {
    if (!evt.active) {
      this.indicatorVisible.set(false);
      return;
    }
    // No special-casing: indicator follows active drop target
    const container = this.host.nativeElement.querySelector('.tree') as HTMLElement;
    const containerRect = container.getBoundingClientRect();
    const elRect = evt.element.getBoundingClientRect();

    // Vertical position: before/after lines snap to top/bottom of the drop zone
    // For inside: draw at the bottom of the row to suggest insertion as first child
    const isAfter = evt.where === 'after';
    const y =
      elRect.top -
      containerRect.top +
      (isAfter || evt.where === 'inside' ? elRect.height : 0);

    // Horizontal position: reflect the level the item will be dropped into
    // - root: level 0 (no indent)
    // - before/after: same level as the target item (its container padding-left)
    // - inside: one level deeper than the target item
    let left = 0;
    let width = containerRect.width;

    const itemEl = evt.element.closest('.item') as HTMLElement | null;
    if (itemEl) {
      const itemRect = itemEl.getBoundingClientRect();
      const computed = getComputedStyle(itemEl);
      const paddingLeft = parseFloat(computed.paddingLeft || '0') || 0;
      const extraIndent = evt.where === 'inside' ? this.indent() : 0;
      left = itemRect.left - containerRect.left + paddingLeft + extraIndent;
      width = Math.max(0, containerRect.width - left);
    } else if (evt.where === 'root') {
      left = 0;
      width = containerRect.width;
    }

    this.indicatorTop.set(Math.round(y));
    this.indicatorLeft.set(Math.max(0, Math.round(left)));
    this.indicatorWidth.set(Math.max(0, Math.round(width)));
    this.indicatorVisible.set(true);
  }

  onRootActive(active: boolean): void {
    this.rootOver.set(active);
  }

  isFolder(n: TreeNode): boolean {
    return !!n.isFolder || n.children !== undefined;
  }

  ngAfterViewInit(): void {
    const cleanup: Array<() => void> = [];

    // Register monitor only (drop-targets + draggables are directives)
    cleanup.push(
      monitorForElements({
        canMonitor: ({ source }) => asDragData(source.data)?.uniqueContextId === this.ctx,
        onDragStart: ({ source }) => {
          const data = asDragData(source.data);
          if (data) this.draggingId.set(data.id);
        },
        onDrop: ({ location, source }) => {
          this.draggingId.set(null);
          const dropTargets = location.current.dropTargets;
          if (!dropTargets.length) {
            this.clearOverStates();
            return;
          }
          const s = asDragData(source.data);
          // Use innermost drop target (last in list for this adapter)
          const target = asDropData(dropTargets[dropTargets.length - 1].data);
          if (!s || !target) {
            this.clearOverStates();
            return;
          }

          // Validate drop operation
          if (!this.isValidDrop(s, target)) {
            this.clearOverStates();
            return;
          }
          if (target.where === 'root') {
            // Drop at the very end of the root list
            const currentRoots = this.nodes();
            const lastRoot = [...currentRoots].reverse().find((n) => n.id !== s.id);
            const instr: MoveInstruction = lastRoot
              ? { itemId: s.id, targetId: lastRoot.id, where: 'after' }
              : { itemId: s.id, targetId: '', where: 'inside' }; // empty root: insert as only item
            const updatedNodes = moveNode(this.nodes(), instr);
            this.nodes.set(updatedNodes);
            this.rebuildNodeCache(updatedNodes);
            this.moved.emit(instr);
            this.updated.emit(this.nodes());
            this.flashJustDropped(s.id);
            this.clearOverStates();
            return;
          }
          if (target.where === 'inside') {
            const targetNode = this.findNode(target.id);
            if (!targetNode) {
              console.warn(`Drop target node with id '${target.id}' not found`);
              this.clearOverStates();
              return;
            }
            if (!this.isFolder(targetNode)) {
              this.clearOverStates();
              return; // disallow dropping inside items
            }
          }
          const instr: MoveInstruction = {
            itemId: s.id,
            targetId: target.id,
            where: target.where,
          } as MoveInstruction;
          const updatedNodes = moveNode(this.nodes(), instr);
          this.nodes.set(updatedNodes);
          this.rebuildNodeCache(updatedNodes);
          this.moved.emit(instr);
          this.updated.emit(this.nodes());
          this.flashJustDropped(s.id);
          this.clearOverStates();
        },
      }),
    );

    this.destroyRef.onDestroy(() => {
      cleanup.forEach((fn) => fn());
      if (this._dropFlashTimer) clearTimeout(this._dropFlashTimer);
      this.justDroppedId.set(null);
    });
  }

  private clearOverStates(): void {
    this.overMap.set({});
    this.rootOver.set(false);
    this.indicatorVisible.set(false);
  }

  private rebuildNodeCache(nodes: TreeNode[]): void {
    const cache = new Map<string, TreeNode>();
    const stack = [...nodes];
    while (stack.length) {
      const node = stack.pop()!;
      cache.set(node.id, node);
      if (node.children) {
        stack.push(...node.children);
      }
    }
    this.nodeCache.set(cache);
  }

  private findNode(id: string): TreeNode | null {
    return this.nodeCache().get(id) ?? null;
  }

  private isValidDrop(dragData: DragData, dropData: DropData): boolean {
    const dragNode = this.findNode(dragData.id);
    if (!dragNode) return false;

    if (dropData.where === 'root') {
      return this.canDrop()({ drag: dragNode, drop: null, where: 'root' });
    }

    // Prevent dropping item onto itself
    if (dragData.id === dropData.id) return false;

    const targetNode = this.findNode(dropData.id);
    if (!targetNode) return false;
    if (this.isNodeAncestor(dragData.id, dropData.id)) return false;
    if (dropData.where === 'inside' && !this.isFolder(targetNode)) return false;

    return this.canDrop()({ drag: dragNode, drop: targetNode, where: dropData.where });
  }

  // removed disallowed hover evaluation

  private isNodeAncestor(ancestorId: string, possibleDescendantId: string): boolean {
    const ancestorNode = this.findNode(ancestorId);
    if (!ancestorNode?.children) return false;

    const stack = [...ancestorNode.children];
    while (stack.length) {
      const node = stack.pop()!;
      if (node.id === possibleDescendantId) return true;
      if (node.children) stack.push(...node.children);
    }
    return false;
  }

  toggle(node: TreeNode): void {
    if (!node.children?.length) return;
    node.expanded = !node.expanded;
    // trigger change and update cache
    const updatedNodes = [...this.nodes()];
    this.nodes.set(updatedNodes);
    this.rebuildNodeCache(updatedNodes);
    this.updated.emit(this.nodes());
  }

  // Imperative update: replace tree data and rebuild cache
  update(nodes: TreeNode[]): void {
    this.nodes.set(nodes ?? []);
    this.rebuildNodeCache(this.nodes());
    this.updated.emit(this.nodes());
  }

  private flashJustDropped(id: string): void {
    this.justDroppedId.set(id);
    if (this._dropFlashTimer) clearTimeout(this._dropFlashTimer);
    this._dropFlashTimer = window.setTimeout(() => {
      if (this.justDroppedId() === id) this.justDroppedId.set(null);
    }, 300);
  }
}
