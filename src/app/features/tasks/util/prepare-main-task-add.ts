import type { DateService } from '../../../core/date/date.service';
import { TaskSharedActions } from '../../../root-store/meta/task-shared.actions';
import type { WorkContextType } from '../../work-context/work-context.model';
import type { Task } from '../task.model';
import { getDeadlineAutoPlanFields } from './get-deadline-auto-plan-fields';

export interface MainTaskAddInput {
  title: string | null;
  additional?: Partial<Task>;
  workContextType: WorkContextType;
  workContextId: string;
  isAddToBacklog?: boolean;
  isAddToBottom?: boolean;
  isIgnoreShortSyntax?: boolean;
}

/** Builds the ordinary add action without applying it to local state. */
export const prepareMainTaskAdd = (
  {
    title,
    additional = {},
    workContextType,
    workContextId,
    isAddToBacklog = false,
    isAddToBottom = false,
    isIgnoreShortSyntax = false,
  }: MainTaskAddInput,
  createTask: (
    input: Pick<
      MainTaskAddInput,
      'title' | 'additional' | 'workContextType' | 'workContextId'
    >,
  ) => Task,
  dateService: Pick<DateService, 'todayStr' | 'getStartOfNextDayDiffMs'>,
): ReturnType<typeof TaskSharedActions.addTask> => {
  const task = createTask({ title, additional, workContextType, workContextId });
  return TaskSharedActions.addTask({
    task,
    workContextId,
    workContextType,
    isAddToBacklog,
    isAddToBottom,
    ...(isIgnoreShortSyntax ? { isIgnoreShortSyntax: true } : {}),
    ...getDeadlineAutoPlanFields(dateService, task.deadlineDay, task.deadlineWithTime),
  });
};
