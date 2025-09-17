export interface ProjectFolder {
  id: string;
  title: string;
  parentId: string | null;
  isExpanded: boolean;
  projectIds: string[];
}

export interface ProjectFolderRootItem {
  id: string;
  type: 'folder' | 'project';
}

export interface ProjectFolderState {
  entities: { [id: string]: ProjectFolder };
  ids: string[];
  rootItems: ProjectFolderRootItem[];
}
