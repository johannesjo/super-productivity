import { TaskRepeatCfg } from './task-repeat-cfg.model';

export const sortRepeatableTaskCfgs = (a: TaskRepeatCfg, b: TaskRepeatCfg): number => {
  // NOTE: sorts to  0, -1, -2, -3, 1, 2, 3, etc
  // we do this because unshift and push are used for task creation and order is reversed for unshift
  return a.order <= 0 && b.order <= 0 ? b.order - a.order : a.order - b.order;
};

// FOR TESTING:
// const arr = Array.from({ length: 40 }, () => ({
//   order: Math.floor(Math.random() * 100) - 50,
// }));
// arr.push({ order: 0 });
// arr.push({ order: 0 });
// arr.push({ order: 0 });
// arr.push({ order: 0 });
// Log.log(arr.sort(sortRepeatableTaskCfgs as any));
