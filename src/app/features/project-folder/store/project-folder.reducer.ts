import { createReducer, on } from '@ngrx/store';
import { ProjectFolderRootItem, ProjectFolderState } from './project-folder.model';
import { updateProjectFolders } from './project-folder.actions';
import { loadAllData } from '../../../root-store/meta/load-all-data.action';

export const projectFolderFeatureKey = 'projectFolder';

export const initialProjectFolderState: ProjectFolderState = {
  entities: {},
  ids: [],
  rootItems: [],
};

// Export as initialState for compatibility with existing code
export const initialState = initialProjectFolderState;

const normalizeRootItems = (input: unknown): ProjectFolderRootItem[] => {
  if (!input) {
    return [];
  }
  if (Array.isArray(input)) {
    if (input.length === 0) {
      return [];
    }
    if (typeof input[0] === 'string') {
      return (input as string[]).map((entry) =>
        entry.startsWith('folder:')
          ? { type: 'folder', id: entry.slice('folder:'.length) }
          : entry.startsWith('project:')
            ? { type: 'project', id: entry.slice('project:'.length) }
            : { type: 'project', id: entry },
      );
    }
    return (input as ProjectFolderRootItem[]).map((entry) => ({
      type: entry.type === 'folder' ? 'folder' : 'project',
      id: entry.id,
    }));
  }
  return [];
};

export const projectFolderReducer = createReducer(
  initialProjectFolderState,
  // META ACTIONS
  // ------------
  on(loadAllData, (state, { appDataComplete }) => {
    const stored = appDataComplete.projectFolder as Partial<ProjectFolderState> &
      Partial<{ rootProjectIds: string[] }>;
    if (!stored) {
      return initialState;
    }
    const rootItems = normalizeRootItems(
      (stored as any).rootItems ?? (stored as any).rootProjectIds,
    );
    return {
      entities: stored.entities ?? {},
      ids: stored.ids ?? [],
      rootItems,
    } satisfies ProjectFolderState;
  }),

  on(updateProjectFolders, (state, { projectFolders, rootItems }) => ({
    entities: Object.fromEntries(projectFolders.map((f) => [f.id, f])),
    ids: projectFolders.map((f) => f.id),
    rootItems,
  })),
);
