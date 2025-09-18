import { Injectable } from '@angular/core';

export interface TreeNodeBase {
  id: string;
  children?: TreeNodeBase[];
}

@Injectable({
  providedIn: 'root',
})
export class TreeUtilsService {
  /**
   * Finds a node in a tree by its ID using depth-first search
   */
  findNode<T extends TreeNodeBase>(tree: T[], id: string): T | undefined {
    for (const node of tree) {
      if (node.id === id) {
        return node;
      }
      if (node.children) {
        const found = this.findNode(node.children as T[], id);
        if (found) {
          return found;
        }
      }
    }
    return undefined;
  }

  /**
   * Maps over a tree structure recursively, applying a transformation function to each node
   */
  mapTree<T extends TreeNodeBase>(tree: T[], mapFn: (node: T) => T): T[] {
    return tree.map((node) => {
      const mapped = mapFn(node);
      if (mapped.children) {
        return {
          ...mapped,
          children: this.mapTree(mapped.children as T[], mapFn),
        };
      }
      return mapped;
    });
  }

  /**
   * Removes a node from a tree and returns the updated tree and the removed node
   */
  removeNode<T extends TreeNodeBase>(
    tree: T[],
    id: string,
  ): { tree: T[]; removed: T } | null {
    const copy = [...tree];
    for (let i = 0; i < copy.length; i++) {
      const node = copy[i];
      if (node.id === id) {
        copy.splice(i, 1);
        return { tree: copy, removed: node };
      }
      if (node.children) {
        const result = this.removeNode(node.children as T[], id);
        if (result) {
          copy[i] = { ...node, children: result.tree };
          return { tree: copy, removed: result.removed };
        }
      }
    }
    return null;
  }

  /**
   * Inserts a node into a tree at the specified parent and index
   */
  insertNode<T extends TreeNodeBase>(
    tree: T[],
    node: T,
    parentId: string | null,
    index: number | undefined,
  ): T[] {
    if (!parentId) {
      const copy = [...tree];
      if (index === undefined || index < 0 || index > copy.length) {
        copy.push(node);
      } else {
        copy.splice(index, 0, node);
      }
      return copy;
    }

    return tree.map((item) => {
      if (item.id === parentId && item.children) {
        const children = [...item.children] as T[];
        const filtered = children.filter((child) => child.id !== node.id);
        if (index === undefined || index < 0 || index > filtered.length) {
          filtered.push(node);
        } else {
          filtered.splice(index, 0, node);
        }
        return {
          ...item,
          children: filtered,
        };
      }
      if (item.children) {
        return {
          ...item,
          children: this.insertNode(item.children as T[], node, parentId, index),
        };
      }
      return item;
    });
  }
}
