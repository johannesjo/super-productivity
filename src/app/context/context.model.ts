export interface ContextCopy {
  id: string;
  title: string;
  icon: string;
  isTranslate: boolean;
  criteria: any;
}

export type Context = Readonly<ContextCopy>;

export interface ContextState {
  activeId: string;
  // additional entities state properties
}
