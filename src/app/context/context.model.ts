export interface ContextCopy {
  id: string;
  title: string;
  icon: string;
  isTranslate: boolean;
  criteria: any;
}

export enum ContextType {
  PROJECT,
  MULTIPLE_PROJECTS
}

export type Context = Readonly<ContextCopy>;

export interface ContextState {
  activeId: string;
  activeType: ContextType;
  // additional entities state properties
}
