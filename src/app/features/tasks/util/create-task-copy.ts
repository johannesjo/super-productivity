import { dirtyDeepCopy } from '../../../util/dirtyDeepCopy';
import { TaskCopy } from '../task.model';

export const createTaskCopy = (task): TaskCopy => {
  return dirtyDeepCopy(task);
};
