export interface ContextCopy {
  id: string;
  title: string;
  icon: string;
  isTranslate: boolean;
  taskIds: string[];
  criteria: any;
}

export enum ContextType {
  PROJECT = 'PROJECT',
  MULTIPLE_PROJECTS = 'MULTIPLE_PROJECTS'
}

export type Context = Readonly<ContextCopy>;

export interface ContextState {
  activeId: string;
  activeType: ContextType;
  // additional entities state properties
}
