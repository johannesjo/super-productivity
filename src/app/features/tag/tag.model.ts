import {EntityState} from '@ngrx/entity';
import {WorkContextCommon} from '../work-context/work-context.model';


export interface TagCopy extends WorkContextCommon {
  id: string;
  icon: string;
  title: string;
  created: number;
  modified: number;
  color: string;
  taskIds: string[];
}

export type Tag = Readonly<TagCopy>;

export interface TagState extends EntityState<Tag> {
  // additional entities state properties
}
