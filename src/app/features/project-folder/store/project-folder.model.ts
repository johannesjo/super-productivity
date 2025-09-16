export interface ProjectFolder {
  id: string;
  title: string;
  parentId: string | null;
  isExpanded: boolean;
  projectIds: string[];
}

export interface ProjectFolderState {
  entities: { [id: string]: ProjectFolder };
  ids: string[];
  rootProjectIds: string[];
}
