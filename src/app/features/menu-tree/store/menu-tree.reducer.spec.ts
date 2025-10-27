import { menuTreeReducer } from './menu-tree.reducer';
import {
  MenuTreeFolderNode,
  MenuTreeKind,
  MenuTreeState,
  MenuTreeTreeNode,
} from './menu-tree.model';
import { TaskSharedActions } from '../../../root-store/meta/task-shared.actions';
import { createMockProject } from '../../../root-store/meta/task-shared-meta-reducers/test-utils';
import { deleteTag, deleteTags } from '../../tag/store/tag.actions';

describe('menuTreeReducer', () => {
  const createFolderNode = (
    id: string,
    children: MenuTreeTreeNode[] = [],
  ): MenuTreeFolderNode => ({
    k: MenuTreeKind.FOLDER,
    id,
    name: `Folder ${id}`,
    isExpanded: true,
    children,
  });

  const createProjectNode = (id: string): MenuTreeTreeNode => ({
    k: MenuTreeKind.PROJECT,
    id,
  });

  const createTagNode = (id: string): MenuTreeTreeNode => ({
    k: MenuTreeKind.TAG,
    id,
  });

  it('removes a top-level project node when deleteProject is dispatched', () => {
    const keepNode = createProjectNode('project-keep');
    const removeNode = createProjectNode('project-remove');
    const untouchedFolder = createFolderNode('folder-untouched');
    const state: MenuTreeState = {
      projectTree: [keepNode, removeNode, untouchedFolder],
      tagTree: [],
    };

    const result = menuTreeReducer(
      state,
      TaskSharedActions.deleteProject({
        project: createMockProject({ id: 'project-remove' }),
        allTaskIds: [],
      }),
    );

    expect(result.projectTree.length).toBe(2);
    expect(result.projectTree.some((node) => node.id === 'project-remove')).toBeFalse();
    expect(result.projectTree[0]).toBe(keepNode);
    expect(result.projectTree[1]).toBe(untouchedFolder);
  });

  it('removes a nested project node while keeping siblings intact', () => {
    const nestedKeep = createProjectNode('project-nested-keep');
    const nestedRemove = createProjectNode('project-nested-remove');
    const folder = createFolderNode('folder-parent', [nestedRemove, nestedKeep]);
    const state: MenuTreeState = {
      projectTree: [folder],
      tagTree: [],
    };

    const result = menuTreeReducer(
      state,
      TaskSharedActions.deleteProject({
        project: createMockProject({ id: 'project-nested-remove' }),
        allTaskIds: [],
      }),
    );

    expect(result.projectTree.length).toBe(1);
    const updatedFolder = result.projectTree[0] as MenuTreeFolderNode;
    expect(updatedFolder.id).toBe('folder-parent');
    expect(updatedFolder.children.length).toBe(1);
    expect(updatedFolder.children[0].id).toBe('project-nested-keep');
    expect(updatedFolder.children[0]).toBe(nestedKeep);
  });

  it('removes a tag from nested folder when deleteTag is dispatched', () => {
    const nestedKeep = createTagNode('tag-nested-keep');
    const nestedRemove = createTagNode('tag-nested-remove');
    const folder = createFolderNode('tag-folder', [nestedRemove, nestedKeep]);
    const state: MenuTreeState = {
      projectTree: [],
      tagTree: [folder],
    };

    const result = menuTreeReducer(
      state,
      deleteTag({
        id: 'tag-nested-remove',
      }),
    );

    expect(result.tagTree.length).toBe(1);
    const updatedFolder = result.tagTree[0] as MenuTreeFolderNode;
    expect(updatedFolder.id).toBe('tag-folder');
    expect(updatedFolder.children.length).toBe(1);
    expect(updatedFolder.children[0].id).toBe('tag-nested-keep');
    expect(updatedFolder.children[0]).toBe(nestedKeep);
  });

  it('removes multiple tags from the tree when deleteTags is dispatched', () => {
    const keepRoot = createTagNode('tag-keep-root');
    const removeRoot = createTagNode('tag-remove-root');
    const nestedKeep = createTagNode('tag-keep-nested');
    const nestedRemove = createTagNode('tag-remove-nested');
    const folder = createFolderNode('folder-tags', [nestedRemove, nestedKeep]);
    const state: MenuTreeState = {
      projectTree: [],
      tagTree: [keepRoot, removeRoot, folder],
    };

    const result = menuTreeReducer(
      state,
      deleteTags({
        ids: ['tag-remove-root', 'tag-remove-nested'],
      }),
    );

    expect(result.tagTree.length).toBe(2);
    expect(result.tagTree.some((node) => node.id === 'tag-remove-root')).toBeFalse();
    const updatedFolder = result.tagTree.find(
      (node) => node.id === 'folder-tags',
    ) as MenuTreeFolderNode;
    expect(updatedFolder.children.length).toBe(1);
    expect(updatedFolder.children[0].id).toBe('tag-keep-nested');
    expect(updatedFolder.children[0]).toBe(nestedKeep);
    expect(result.tagTree.find((node) => node.id === 'tag-keep-root')).toBe(keepRoot);
  });
});
