import {ShowSubTasksMode, TaskCopy, TimeSpentOnDay} from '../../features/tasks/task.model';
import {IssueProviderKey} from '../../features/issue/issue';

export class TaskClass implements TaskCopy {
  id: string;
  projectId: string;
  title: string;

  subTaskIds: string[];
  timeSpentOnDay: TimeSpentOnDay;
  timeSpent: number;
  timeEstimate: number;

  created: number;
  isDone: boolean;

  notes: string;
  issueId: string;
  issueType: IssueProviderKey;
  parentId: string;
  attachmentIds: string[];
  reminderId?: string;
  repeatCfgId: string;

  // ui model
  _isAdditionalInfoOpen: boolean;
  // 0: show, 1: hide-done tasks, 2: hide all sub tasks
  _showSubTasksMode: ShowSubTasksMode;
  _currentTab: number;


  constructor() {
    // Define navigation properties.
    // Making them non-enumerable will prevent them from being handled by indexedDB
    // when doing put() or add().
    Object.defineProperties(this, {
      timeSpentOnDay: {value: {}, enumerable: false, writable: true},
      attachmentIds: {value: [], enumerable: false, writable: true}
    });
  }

}
