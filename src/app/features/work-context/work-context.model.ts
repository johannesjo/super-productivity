export interface WorkContextCopy {
  id: string;
  title: string;
  icon: string;
  isTranslate: boolean;
  taskIds: string[];
}

export enum WorkContextType {
  PROJECT = 'PROJECT',
  TAG = 'TAG'
}

export type WorkContext = Readonly<WorkContextCopy>;

export interface WorkContextState {
  activeId: string;
  activeType: WorkContextType;
  // additional entities state properties
}
