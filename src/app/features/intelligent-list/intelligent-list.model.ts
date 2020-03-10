import {EntityState} from '@ngrx/entity';

export interface IntelligentListCopy {
  id: string;
  title: string;
  icon: string;
  isTranslate: boolean;
  criteria: any;
}

export type IntelligentList = Readonly<IntelligentListCopy>;

export interface IntelligentListState extends EntityState<IntelligentList> {
  currentId: string;
}
