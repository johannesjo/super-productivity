import { Task } from './task.model';

export const createTask = (
  { id = 'DEFAULT', title = 'DEFAULT', ...rest }: Partial<Task> = {
    id: 'DEFAULT',
    title: 'DEFAULT',
  },
): Task => {
  return {
    id,
    title,
    subTaskIds: [],
    attachmentIds: [],
    issueId: null,
    issuePoints: null,
    issueType: null,
    issueWasUpdated: null,
    isDone: false,
    notes: '',
    timeEstimate: 0,
    timeSpent: 0,
    timeSpentOnDay: {},
    created: Date.now(),
    ...rest,
  } as Task;
};
