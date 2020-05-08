import {getCompleteStateForWorkContext} from './get-complete-state-for-work-context.util';
import {DEFAULT_TAG} from '../../tag/tag.const';
import {WorkContext, WorkContextType} from '../../work-context/work-context.model';
import {WORK_CONTEXT_DEFAULT_THEME} from '../../work-context/work-context.const';
import {DEFAULT_TASK, Task, TaskCopy} from '../../tasks/task.model';
import {Dictionary, EntityState} from '@ngrx/entity';
import {arrayToDictionary} from '../../../util/array-to-dictionary';

const TAG_ID = 'TAG_ID';

const TAG_CTX = {
  ...DEFAULT_TAG,
  id: TAG_ID,
  title: 'TAG',
  icon: 'string',
  routerLink: 'string',
  taskIds: ['A'],
  type: WorkContextType.TAG,
  theme: WORK_CONTEXT_DEFAULT_THEME,
} as WorkContext;

const fakeTaskStateFromArray = (tasks: TaskCopy[]): EntityState<Task> => {
  const dict = arrayToDictionary(tasks) as Dictionary<TaskCopy>;
  return {
    entities: dict,
    ids: Object.keys(dict),
  } as EntityState<Task>;
};

describe('getCompleteStateForWorkContext', () => {
  fit('should include sub tasks for tags', () => {
    const ts = fakeTaskStateFromArray([
      {
        ...DEFAULT_TASK,
        title: 'PT',
        id: 'PT',
        tagIds: [TAG_ID],
        subTaskIds: ['SUB_B', 'SUB_C'],
      },
      {
        ...DEFAULT_TASK,
        title: 'SUB_B',
        id: 'SUB_B',
        parentId: 'PT',
      },
      {
        ...DEFAULT_TASK,
        title: 'SUB_C',
        id: 'SUB_C',
        parentId: 'PT',
      },
    ]);

    const r = getCompleteStateForWorkContext(TAG_CTX, ts, fakeTaskStateFromArray([]));
    // expect(r.unarchivedIds).toEqual(['PT', 'SUB_B', 'SUB_C']);
    expect(r.completeStateForWorkContext.ids).toEqual(['PT', 'SUB_B', 'SUB_C']);
  });


  xit('should include sub tasks for tags for the archive', () => {
    const ts = fakeTaskStateFromArray([
      {
        ...DEFAULT_TASK,
        title: 'PT',
        id: 'PT',
        tagIds: [TAG_ID],
        subTaskIds: ['SUB_B', 'SUB_C'],
      },
      {
        ...DEFAULT_TASK,
        title: 'SUB_B',
        id: 'SUB_B',
        parentId: 'PT',
      },
      {
        ...DEFAULT_TASK,
        title: 'SUB_C',
        id: 'SUB_C',
        parentId: 'PT',
      },
    ]);
    const r = getCompleteStateForWorkContext(TAG_CTX, fakeTaskStateFromArray([]), ts);
    expect(r.completeStateForWorkContext.ids).toEqual(['A', 'SUB_B', 'SUB_C']);
  });
});

