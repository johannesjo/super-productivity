import { EntityState } from '@ngrx/entity';
import { WorkContextAdvancedCfgKey, WorkContextCommon } from '../work-context/work-context.model';
import { MODEL_VERSION_KEY } from '../../app.constants';

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
  [MODEL_VERSION_KEY]?: number;
}

export type TagCfgFormKey = WorkContextAdvancedCfgKey | 'basic' | 'theme';
