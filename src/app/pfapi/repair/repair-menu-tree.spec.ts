import { repairMenuTree } from './repair-menu-tree';
import {
  MenuTreeKind,
  MenuTreeState,
} from '../../features/menu-tree/store/menu-tree.model';

describe('repairMenuTree', () => {
  it('should remove orphaned project references from projectTree', () => {
    const validProjectIds = new Set(['project1', 'project2']);
    const validTagIds = new Set<string>();

    const menuTree: MenuTreeState = {
      projectTree: [
        { kind: MenuTreeKind.PROJECT, id: 'project1' },
        { kind: MenuTreeKind.PROJECT, id: 'orphaned-project' },
        { kind: MenuTreeKind.PROJECT, id: 'project2' },
      ],
      tagTree: [],
    };

    const result = repairMenuTree(menuTree, validProjectIds, validTagIds);

    expect(result.projectTree.length).toBe(2);
    expect(result.projectTree).toEqual([
      { kind: MenuTreeKind.PROJECT, id: 'project1' },
      { kind: MenuTreeKind.PROJECT, id: 'project2' },
    ]);
  });

  it('should remove orphaned tag references from tagTree', () => {
    const validProjectIds = new Set<string>();
    const validTagIds = new Set(['tag1', 'tag2']);

    const menuTree: MenuTreeState = {
      projectTree: [],
      tagTree: [
        { kind: MenuTreeKind.TAG, id: 'tag1' },
        { kind: MenuTreeKind.TAG, id: 'orphaned-tag' },
        { kind: MenuTreeKind.TAG, id: 'tag2' },
      ],
    };

    const result = repairMenuTree(menuTree, validProjectIds, validTagIds);

    expect(result.tagTree.length).toBe(2);
    expect(result.tagTree).toEqual([
      { kind: MenuTreeKind.TAG, id: 'tag1' },
      { kind: MenuTreeKind.TAG, id: 'tag2' },
    ]);
  });

  it('should keep folders even if they end up empty', () => {
    const validProjectIds = new Set(['project1']);
    const validTagIds = new Set<string>();

    const menuTree: MenuTreeState = {
      projectTree: [
        {
          kind: MenuTreeKind.FOLDER,
          id: 'folder1',
          name: 'Folder 1',
          isExpanded: true,
          children: [
            { kind: MenuTreeKind.PROJECT, id: 'project1' },
            { kind: MenuTreeKind.PROJECT, id: 'orphaned-project' },
          ],
        },
      ],
      tagTree: [],
    };

    const result = repairMenuTree(menuTree, validProjectIds, validTagIds);

    expect(result.projectTree.length).toBe(1);
    expect(result.projectTree[0].kind).toBe(MenuTreeKind.FOLDER);
    if (result.projectTree[0].kind === MenuTreeKind.FOLDER) {
      expect(result.projectTree[0].id).toBe('folder1');
      expect(result.projectTree[0].children.length).toBe(1);
      expect(result.projectTree[0].children[0]).toEqual({
        kind: MenuTreeKind.PROJECT,
        id: 'project1',
      });
    }
  });

  it('should handle nested folders correctly', () => {
    const validProjectIds = new Set(['project1', 'project2']);
    const validTagIds = new Set<string>();

    const menuTree: MenuTreeState = {
      projectTree: [
        {
          kind: MenuTreeKind.FOLDER,
          id: 'parent-folder',
          name: 'Parent',
          isExpanded: true,
          children: [
            { kind: MenuTreeKind.PROJECT, id: 'project1' },
            {
              kind: MenuTreeKind.FOLDER,
              id: 'nested-folder',
              name: 'Nested',
              isExpanded: false,
              children: [
                { kind: MenuTreeKind.PROJECT, id: 'project2' },
                { kind: MenuTreeKind.PROJECT, id: 'orphaned-nested-project' },
              ],
            },
          ],
        },
      ],
      tagTree: [],
    };

    const result = repairMenuTree(menuTree, validProjectIds, validTagIds);

    expect(result.projectTree.length).toBe(1);
    if (result.projectTree[0].kind === MenuTreeKind.FOLDER) {
      expect(result.projectTree[0].children.length).toBe(2);
      const nestedFolder = result.projectTree[0].children[1];
      if (nestedFolder.kind === MenuTreeKind.FOLDER) {
        expect(nestedFolder.children.length).toBe(1);
        expect(nestedFolder.children[0]).toEqual({
          kind: MenuTreeKind.PROJECT,
          id: 'project2',
        });
      }
    }
  });

  it('should return empty arrays for invalid tree structures', () => {
    const validProjectIds = new Set(['project1']);
    const validTagIds = new Set<string>();

    const menuTree: MenuTreeState = {
      projectTree: null as any,
      tagTree: undefined as any,
    };

    const result = repairMenuTree(menuTree, validProjectIds, validTagIds);

    expect(result.projectTree).toEqual([]);
    expect(result.tagTree).toEqual([]);
  });

  it('should preserve valid folder structure', () => {
    const validProjectIds = new Set(['project1', 'project2']);
    const validTagIds = new Set<string>();

    const menuTree: MenuTreeState = {
      projectTree: [
        {
          kind: MenuTreeKind.FOLDER,
          id: 'folder1',
          name: 'Work Projects',
          isExpanded: true,
          children: [
            { kind: MenuTreeKind.PROJECT, id: 'project1' },
            { kind: MenuTreeKind.PROJECT, id: 'project2' },
          ],
        },
      ],
      tagTree: [],
    };

    const result = repairMenuTree(menuTree, validProjectIds, validTagIds);

    expect(result.projectTree).toEqual(menuTree.projectTree);
  });

  it('should remove mismatched node kinds', () => {
    const validProjectIds = new Set(['project1']);
    const validTagIds = new Set(['tag1']);

    const menuTree: MenuTreeState = {
      projectTree: [
        { kind: MenuTreeKind.PROJECT, id: 'project1' },
        { kind: MenuTreeKind.TAG, id: 'tag1' } as any,
      ],
      tagTree: [
        { kind: MenuTreeKind.TAG, id: 'tag1' },
        { kind: MenuTreeKind.PROJECT, id: 'project1' } as any,
      ],
    };

    const result = repairMenuTree(menuTree, validProjectIds, validTagIds);

    expect(result.projectTree).toEqual([{ kind: MenuTreeKind.PROJECT, id: 'project1' }]);
    expect(result.tagTree).toEqual([{ kind: MenuTreeKind.TAG, id: 'tag1' }]);
  });
});
