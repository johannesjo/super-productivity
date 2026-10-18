import { T } from '../../../t.const';
import { PLAINSPACE_TYPE } from '../../issue/issue.const';
import { Task } from '../task.model';

type DeleteConfirmTask = Pick<Task, 'title' | 'issueType'>;

/**
 * Deleting a Plainspace task deletes it for everyone in its Space, which has no
 * trash, so it always confirms, even with `isConfirmBeforeDelete` off (the same
 * as a bulk delete).
 */
export const isTaskDeleteConfirmRequired = (
  task: DeleteConfirmTask,
  isConfirmBeforeDelete: boolean,
): boolean => isConfirmBeforeDelete || task.issueType === PLAINSPACE_TYPE;

/** Confirm-dialog data for deleting a single task. */
export const getTaskDeleteConfirmData = (
  task: DeleteConfirmTask,
  title: string = task.title,
): {
  okTxt: string;
  message: string;
  isFocusConfirm: boolean;
  translateParams: { title: string };
} => ({
  okTxt: T.F.TASK.D_CONFIRM_DELETE.OK,
  message:
    task.issueType === PLAINSPACE_TYPE
      ? T.F.TASK.D_CONFIRM_DELETE.MSG_PLAINSPACE
      : T.F.TASK.D_CONFIRM_DELETE.MSG,
  isFocusConfirm: true,
  translateParams: { title },
});
