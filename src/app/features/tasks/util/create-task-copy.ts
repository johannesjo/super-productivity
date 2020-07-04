import { dirtyDeepCopy } from '../../../util/dirtyDeepCopy';
import { Task, TaskCopy } from '../task.model';

export const createTaskCopy = (task: Task): TaskCopy => {
  return dirtyDeepCopy(task);
};
