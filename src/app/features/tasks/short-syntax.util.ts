import { Task } from './task.model';
import { getWorklogStr } from '../../util/get-work-log-str';
import { stringToMs } from '../../ui/duration/string-to-ms.pipe';
import { Tag } from '../tag/tag.model';

export const SHORT_SYNTAX_REG_EX = / t?(([0-9]+(m|h|d)+)? *\/ *)?([0-9]+(m|h|d)+) *$/i;

export const shortSyntax = (task: Task | Partial<Task>, allTags?: Tag[]): Task | Partial<Task> => {
  if (!task.title) {
    return task;
  }
  const matches = SHORT_SYNTAX_REG_EX.exec(task.title);

  if (matches && matches.length >= 3) {
    const full = matches[0];
    const timeSpent = matches[2];
    const timeEstimate = matches[4];

    return {
      ...task,
      ...(
        timeSpent
          ? {
            timeSpentOnDay: {
              ...(task.timeSpentOnDay || {}),
              [getWorklogStr()]: stringToMs(timeSpent)
            }
          }
          : {}
      ),
      timeEstimate: stringToMs(timeEstimate),
      title: task.title.replace(full, '')
    };

  } else {
    return task;
  }
};
