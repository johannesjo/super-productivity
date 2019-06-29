import { EntityState } from '@ngrx/entity';

export interface TaskRepeatCfgCopy {
    id: string;
}

export type TaskRepeatCfg = Readonly<TaskRepeatCfgCopy>;

export interface TaskRepeatCfgState extends EntityState<TaskRepeatCfg> {
    // additional entities state properties
}
