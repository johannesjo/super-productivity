import { TaskRepeatCfg } from './task-repeat-cfg.model';

export const sortRepeatableTaskCfgs = (a: TaskRepeatCfg, b: TaskRepeatCfg): number =>
  a.order - b.order;
