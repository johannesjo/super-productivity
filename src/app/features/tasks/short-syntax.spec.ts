import { ShowSubTasksMode, TaskCopy } from './task.model';
import { shortSyntax } from './short-syntax.util';
import { getWorklogStr } from '../../util/get-work-log-str';

const TASK: TaskCopy = {
  id: 'id',
  projectId: null,
  subTaskIds: [],
  timeSpentOnDay: {},
  timeSpent: 0,
  timeEstimate: 0,
  isDone: false,
  doneOn: null,
  title: '',
  notes: '',
  tagIds: [],
  parentId: null,
  reminderId: null,
  created: Date.now(),
  repeatCfgId: null,

  _showSubTasksMode: ShowSubTasksMode.Show,

  attachments: [],

  issueId: null,
  issuePoints: null,
  issueType: null,
  issueAttachmentNr: null,
  issueLastUpdated: null,
  issueWasUpdated: null,
};

describe('shortSyntax', () => {
  it('should work for no short syntax', () => {
    const r = shortSyntax(TASK);
    expect(r).toEqual(TASK);
  });

  describe('should work for time short syntax', () => {
    it('', () => {
      const t = {
        ...TASK,
        title: 'Fun title 10m/1h'
      };
      const r = shortSyntax(t);
      expect(r).toEqual({
        ...t,
        title: 'Fun title',
        // timeSpent: 7200000,
        timeSpentOnDay: {
          [getWorklogStr()]: 600000
        },
        timeEstimate: 3600000
      });
    });


    it('', () => {
      const t = {
        ...TASK,
        title: 'Fun title whatever 1h/120m'
      };
      const r = shortSyntax(t);
      expect(r).toEqual({
        ...TASK,
        title: 'Fun title whatever',
        // timeSpent: 7200000,
        timeSpentOnDay: {
          [getWorklogStr()]: 3600000
        },
        timeEstimate: 7200000
      });
    });
  });
});
