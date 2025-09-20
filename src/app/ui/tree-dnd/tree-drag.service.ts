import { Injectable } from '@angular/core';
import { CdkDragDrop } from '@angular/cdk/drag-drop';
import {
  DropWhere,
  MoveInstruction,
  TreeNode,
  TreeId,
  HoverTarget,
  DropListContext,
  CanDropPredicate,
  PointerPosition,
} from './tree.types';

// Function type definitions for dependency injection
type NodeFinderFn<TData = unknown> = (id: TreeId) => TreeNode<TData> | null;
type NodesFn<TData = unknown> = () => TreeNode<TData>[];
type SiblingsFn<TData = unknown> = (parentId: TreeId) => readonly TreeNode<TData>[];
type IsFolderFn<TData = unknown> = (node: TreeNode<TData>) => boolean;
type IsAncestorFn = (ancestorId: TreeId, descendantId: TreeId) => boolean;

// Drop zone calculation constants for folders
const FOLDER_THRESHOLD_RATIO = 0.2 as const; // 20% of item height for before/after zones (folders)
const FOLDER_MAX_THRESHOLD = 8 as const; // Maximum pixel threshold for folders

/**
 * Service responsible for converting drag/drop interactions into tree move instructions.
 *
 * This service handles the complex logic of determining where a dragged item should be moved
 * based on different types of drop events. It provides two main approaches:
 *
 * 1. **Hover-based detection**: Uses mouse position to determine precise drop zones
 * 2. **Drop-list-based detection**: Uses CDK's container and index information
 *
 * The service is stateless and requires callback functions to access tree data,
 * making it reusable across different tree component instances.
 */
@Injectable()
export class TreeDragService {
  /**
   * Builds a move instruction based on precise mouse hover position.
   *
   * This method is used when the user hovers over specific drop zones during drag.
   * It provides pixel-perfect feedback for where the item will be dropped.
   *
   * @param dragId - ID of the item being dragged
   * @param hover - Contains the target element, drop zone (before/after/inside), and target ID
   * @param findNode - Function to find a node by ID in the tree
   * @param getNodes - Function to get all root nodes
   * @param isFolder - Function to check if a node can contain children
   * @param isNodeAncestor - Function to prevent dropping into descendants
   * @param canDrop - Function to validate if the drop is allowed by business rules
   * @returns MoveInstruction or null if the drop is invalid
   */
  buildInstructionFromHover<TData = unknown>(
    dragId: TreeId,
    hover: HoverTarget,
    findNode: NodeFinderFn<TData>,
    getNodes: NodesFn<TData>,
    isFolder: IsFolderFn<TData>,
    isNodeAncestor: IsAncestorFn,
    canDrop: CanDropPredicate<TData>,
  ): MoveInstruction | null {
    const dragNode = findNode(dragId);
    if (!dragNode) return null;

    // Handle dropping to root level (empty area at bottom of tree)
    if (hover.where === 'root') {
      if (!canDrop({ drag: dragNode, drop: null, where: 'root' })) return null;
      const roots = getNodes().filter((n) => n.id !== dragId);
      // If no other root items, place as first root item
      if (!roots.length) return { itemId: dragId, targetId: '', where: 'inside' };
      // Otherwise, place after the last root item
      return { itemId: dragId, targetId: roots[roots.length - 1].id, where: 'after' };
    }

    // Can't drop on self
    if (dragId === hover.id) return null;
    const targetNode = findNode(hover.id);
    // Can't drop on non-existent nodes or into descendants (would create cycles)
    if (!targetNode || isNodeAncestor(dragId, hover.id)) return null;

    // Handle dropping inside a folder
    if (hover.where === 'inside') {
      if (
        !isFolder(targetNode) ||
        !canDrop({ drag: dragNode, drop: targetNode, where: 'inside' })
      )
        return null;
      return { itemId: dragId, targetId: hover.id, where: 'inside' };
    }

    // Handle dropping before/after an item (sibling positioning)
    if (!canDrop({ drag: dragNode, drop: targetNode, where: hover.where })) return null;
    return { itemId: dragId, targetId: hover.id, where: hover.where };
  }

  /**
   * Builds a move instruction based on Angular CDK drop list container and index.
   *
   * This method is used when items are dropped into CDK drop lists. It's more reliable
   * for list ordering but less precise than hover-based detection for folder targeting.
   * The CDK provides the target container and the index where the item was dropped.
   *
   * @param dragId - ID of the item being dragged
   * @param event - CDK drop event containing container data and drop index
   * @param findNode - Function to find a node by ID in the tree
   * @param getSiblings - Function to get siblings of a parent node
   * @param isFolder - Function to check if a node can contain children
   * @param isNodeAncestor - Function to prevent dropping into descendants
   * @param canDrop - Function to validate if the drop is allowed by business rules
   * @returns MoveInstruction or null if the drop is invalid
   */
  buildInstructionFromDropEvent<TData = unknown>(
    dragId: TreeId,
    event: CdkDragDrop<DropListContext<TData>>,
    findNode: NodeFinderFn<TData>,
    getSiblings: SiblingsFn<TData>,
    isFolder: IsFolderFn<TData>,
    isNodeAncestor: IsAncestorFn,
    canDrop: CanDropPredicate<TData>,
  ): MoveInstruction | null {
    const dragNode = findNode(dragId);
    if (!dragNode) return null;

    // Extract drop container information
    const containerData = event.container.data;
    const parentId = containerData?.parentId ?? '';
    // Prevent dropping into descendants (would create invalid tree structure)
    if (parentId && isNodeAncestor(dragId, parentId)) return null;

    // Get siblings in the target container, excluding the dragged item
    const siblings = (containerData?.items ?? getSiblings(parentId)).filter(
      (n) => n.id !== dragId,
    ) as TreeNode<TData>[];
    // Clamp the drop index to valid range
    const index = Math.min(Math.max(event.currentIndex, 0), siblings.length);

    // Handle dropping into root level (top-level container)
    if (!parentId) {
      if (!canDrop({ drag: dragNode, drop: null, where: 'root' })) return null;
      // If no siblings, this becomes the first root item
      if (!siblings.length) return { itemId: dragId, targetId: '', where: 'inside' };
      // If dropped past the end, place after the last sibling
      if (index >= siblings.length)
        return {
          itemId: dragId,
          targetId: siblings[siblings.length - 1].id,
          where: 'after',
        };
      // Otherwise, place before the sibling at the drop index
      return { itemId: dragId, targetId: siblings[index].id, where: 'before' };
    }

    // Handle dropping into a folder
    const parentNode = findNode(parentId);
    if (!parentNode || !isFolder(parentNode)) return null;

    // If folder is empty, place as first child
    if (!siblings.length) {
      if (!canDrop({ drag: dragNode, drop: parentNode, where: 'inside' })) return null;
      return { itemId: dragId, targetId: parentId, where: 'inside' };
    }

    // Place relative to sibling at the drop index
    const targetId = siblings[Math.min(index, siblings.length - 1)].id;
    const targetNode = findNode(targetId);
    if (!targetNode) return null;

    // If dropped past the end, place after the last sibling; otherwise before the target sibling
    const where = index >= siblings.length ? 'after' : 'before';
    if (!canDrop({ drag: dragNode, drop: targetNode, where })) return null;
    return { itemId: dragId, targetId, where };
  }

  /**
   * Calculates which drop zone (before/after/inside) the pointer is in.
   * This uses proportional thresholds - folders get smaller before/after zones
   * to make the "inside" zone easier to target.
   *
   * Example for a 40px tall item:
   * - Files: 10px before, 20px inside, 10px after (25% each side)
   * - Folders: 8px before, 24px inside, 8px after (20% each side)
   */
  calculateHoverZone(
    pointer: PointerPosition,
    itemRect: DOMRect,
    isTargetFolder?: boolean,
  ): DropWhere {
    const offsetY = pointer.y - itemRect.top;

    // Different logic for folders vs regular items
    if (isTargetFolder) {
      // Folders get smaller before/after zones so "inside" is easier to target
      const threshold = Math.min(
        itemRect.height * FOLDER_THRESHOLD_RATIO,
        FOLDER_MAX_THRESHOLD,
      );
      if (offsetY < threshold) return 'before';
      if (offsetY > itemRect.height - threshold) return 'after';
      return 'inside';
    } else {
      // Regular items: no inside zone, just before/after based on which half
      const midpoint = itemRect.height / 2;
      return offsetY < midpoint ? 'before' : 'after';
    }
  }

  /**
   * Simple utility to check if a point is within a rectangle.
   * Used for boundary detection during drag operations.
   */
  isPointInRect(point: PointerPosition, rect: DOMRect): boolean {
    return (
      point.x >= rect.left &&
      point.x <= rect.right &&
      point.y >= rect.top &&
      point.y <= rect.bottom
    );
  }
}
