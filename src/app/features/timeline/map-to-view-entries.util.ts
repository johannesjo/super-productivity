import { Task } from '../tasks/task.model';
import { TimelineViewEntry, TimelineViewEntryType } from './timeline.model';
import { msToString } from '../../ui/duration/ms-to-string.pipe';

export const mapToViewEntries = (tasks: Task[], currentId: string | null, startTime: number = Date.now()): TimelineViewEntry[] => {
  const viewEntries: TimelineViewEntry[] = [];
  const scheduledTasks: Task[] = [];

  let lastTime: any;
  let prev: any;
  let sortedTasks: Task[] = tasks;

  // make current always first task
  if (currentId) {
    const currentTask = tasks.find(t => t.id === currentId);
    if (currentTask) {
      sortedTasks = [currentTask, ...tasks.filter(t => t.id !== currentId)] as Task[];
    }
  }

  sortedTasks.forEach((task, index, arr) => {
    if (task.reminderId && task.plannedAt) {
      scheduledTasks.push(task);
      return;
    }

    prev = arr[index - 1];
    let time;

    if (lastTime) {
      if (prev) {
        time = lastTime + getTimeForTask(prev);
      } else {
        throw new Error('Something weird happened');
      }
    } else {
      time = startTime;
    }

    viewEntries.push({
      id: task.id,
      type: TimelineViewEntryType.TaskFull,
      time,
      data: task,
      // TODO add isSameTimeAsPrevious at the very end
      isSameTimeAsPrevious: (time === lastTime),
    });

    lastTime = time;
  });

  // const lastEntry = viewEntries && viewEntries[viewEntries.length - 1];
  // console.log({lastEntry});
  //
  // if (lastEntry && lastEntry.type === TimelineViewEntryType.TaskFull) {
  //   const task = lastEntry.data;
  //   viewEntries.push({
  //     id: 'END',
  //     type: TimelineViewEntryType.WorkdayEnd,
  //     time: lastTime + Math.max(0, task.timeEstimate - task.timeSpent)
  //   });
  // }

  if (scheduledTasks.length) {
    scheduledTasks.forEach((scheduledTask, i) => {
      const firstEntryBeforeIndex = viewEntries.findIndex(
        viewEntry =>
          viewEntry.time
          && viewEntry.time !== 0
          && viewEntry.time >= (scheduledTask.plannedAt as number)
      );

      // TODO check once we have more different
      const splitTask: Task | undefined = viewEntries[firstEntryBeforeIndex - 1]?.data as Task;
      const scheduledTaskDuration = getTimeForTask(scheduledTask);

      viewEntries.splice(firstEntryBeforeIndex || 0, 0, {
        id: scheduledTask.id,
        time: scheduledTask.plannedAt,
        type: TimelineViewEntryType.TaskFull,
        data: scheduledTask,
        isSameTimeAsPrevious: false,
      });

      const isAddSplitTask = (splitTask && (splitTask.timeEstimate - splitTask.timeSpent > 0));
      if (isAddSplitTask) {
        const splitTime = getTimeForTask(splitTask) - scheduledTaskDuration;
        const splitStr = msToString(splitTime);
        viewEntries.splice(firstEntryBeforeIndex + 1, 0, {
          id: (splitTask as Task).id,
          time: (scheduledTask.plannedAt as number) + scheduledTaskDuration,
          type: TimelineViewEntryType.Text,
          data: '... ' + (splitTask as Task).title + ' (' + splitStr + ')',
          isSameTimeAsPrevious: true,
        });
      }

      const startIndexOfFollowing = firstEntryBeforeIndex + (isAddSplitTask ? 2 : 1);
      // eslint-disable-next-line @typescript-eslint/prefer-for-of
      for (let j = startIndexOfFollowing; j < viewEntries.length; j++) {
        const viewEntry = viewEntries[j];
        if (viewEntry.time) {
          viewEntry.time = viewEntry.time + scheduledTaskDuration;
        }
      }
    });
  }

  console.log(viewEntries);

  return viewEntries;
  //   {
  //     type: TimelineViewEntryType.TaskFull,
  //     time: Date.now(),
  //     data: {
  //       ...DEFAULT_TASK,
  //       title: 'SomeTask',
  //     }
  //   },
};

const getTimeForTask = (task: Task): number => {
  return Math.max(0, task.timeEstimate - task.timeSpent) || 0;
};
