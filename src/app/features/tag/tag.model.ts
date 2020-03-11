import {WorkContextCommon} from '../work-context/work-context.model';

export interface Tag extends WorkContextCommon {
  id: string;
  icon: string;
  name: string;
  created: number;
  modified: number;
  color: string;
}
