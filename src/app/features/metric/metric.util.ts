import {Worklog} from '../worklog/worklog.model';
import {TaskWithIssueData} from '../tasks/task.model';
import {getWorklogStr} from '../../util/get-work-log-str';
import {SimpleMetrics} from './metric.model';

export const mapSimpleMetrics = ([w, tt, allTasks]: [Worklog, number, TaskWithIssueData[]]): SimpleMetrics => {
  const s = {
    start: 99999999999999999999999,
    end: getWorklogStr(),
    timeSpent: tt,
    timeEstimate: 0,
    nrOfCompletedTasks: 0,
    nrOfAllTasks: allTasks.length,
    nrOfSubTasks: 0,
    nrOfMainTasks: 0,
    nrOfParentTasks: 0,
    daysWorked: Object.keys(w).reduce((acc, y) => acc + w[y].daysWorked, 0),
  };

  allTasks.forEach((task) => {
    if ((task.created < s.start)) {
      s.start = task.created;
    }

    if (task.parentId) {
      s.nrOfSubTasks++;
    } else {
      s.nrOfMainTasks++;
      s.timeEstimate += task.timeEstimate;
    }

    if (task.subTaskIds && task.subTaskIds.length) {
      s.nrOfParentTasks++;
    } else {
      // s.timeSpent = s.timeSpent + Object.keys(task.timeSpentOnDay).reduce((acc, v) => acc + task.timeSpentOnDay [v], 0);
    }

    if (task.isDone) {
      s.nrOfCompletedTasks++;
    }
  });

  return {
    ...s,
    start: getWorklogStr(s.start),
    avgTasksPerDay: s.nrOfMainTasks / s.daysWorked,
    avgTimeSpentOnDay: s.timeSpent / s.daysWorked,
    avgTimeSpentOnTask: s.timeSpent / s.nrOfMainTasks,
    avgTimeSpentOnTaskIncludingSubTasks: s.timeSpent / (s.nrOfAllTasks - s.nrOfParentTasks),

  };
};
