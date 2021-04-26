import { Task } from '../tasks/task.model';
import { TimelineViewEntry, TimelineViewEntryType } from './timeline.model';

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
        time = lastTime + Math.max(0, prev.timeEstimate - prev.timeSpent);
      } else {
        time = lastTime;
      }
    } else {
      time = startTime;
    }

    // console.log(time, lastTime);

    viewEntries.push({
      id: task.id,
      type: TimelineViewEntryType.TaskFull,
      time: (time === lastTime)
        ? 0
        : time,
      data: task,
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
      const scheduledTaskDuration = Math.max(0, scheduledTask.timeEstimate - scheduledTask.timeSpent);

      viewEntries.splice(firstEntryBeforeIndex || 0, 0, {
        id: scheduledTask.id,
        time: scheduledTask.plannedAt,
        type: TimelineViewEntryType.TaskFull,
        data: scheduledTask,
      });

      const isAddSplitTask = (splitTask && (splitTask.timeEstimate - splitTask.timeSpent > 0));
      if (isAddSplitTask) {
        viewEntries.splice(firstEntryBeforeIndex + 1, 0, {
          id: (splitTask as Task).id,
          time: (scheduledTask.plannedAt as number) + scheduledTaskDuration,
          type: TimelineViewEntryType.Text,
          data: '... ' + (splitTask as Task).title,
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
