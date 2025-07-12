import { DropListModelSource } from '../../tasks/task.model';
import { filterOutId } from '../../../util/filter-out-id';

export const moveTaskForWorkContextLikeState = (
  taskId: string,
  newOrderedIds: string[],
  target: DropListModelSource | null,
  taskIdsBefore: string[],
): string[] => {
  const idsFilteredMoving = taskIdsBefore.filter(filterOutId(taskId));
  // NOTE: move to end of complete list for done tasks
  const emptyListVal = target === 'DONE' ? idsFilteredMoving.length : 0;
  return moveItemInList(taskId, idsFilteredMoving, newOrderedIds, emptyListVal);
};

/*
We use this function because the dom list provided by the drag & drop event, might not
be the same as actual list, because items might be sorted differently (done/undone) or
items might be hidden (done sub tasks).
Please note that the completeList depending on the circumstances might or might not
include the itemId, while the partialList always should.
*/
export const moveItemInList = (
  itemId: string,
  completeList: string[],
  partialList: string[],
  emptyListVal = 0,
): string[] => {
  // Log.log(itemId, completeList, partialList);

  let newIndex;
  const curInUpdateListIndex = partialList.indexOf(itemId);
  const prevItemId = partialList[curInUpdateListIndex - 1];
  const nextItemId = partialList[curInUpdateListIndex + 1];
  const newCompleteListWithoutItem = completeList.filter((id) => id !== itemId);

  if (!partialList.includes(itemId)) {
    throw new Error('Drop Model Error');
  }

  if (!itemId) {
    throw new Error('Drop Model Error');
    // } else if (newCompleteListWithoutItem.length === 0) {
    //   newIndex = 0;
  } else if (prevItemId) {
    newIndex = newCompleteListWithoutItem.indexOf(prevItemId) + 1;
  } else if (nextItemId) {
    newIndex = newCompleteListWithoutItem.indexOf(nextItemId);
  } else if (partialList.length === 1) {
    newIndex = emptyListVal;
  } else {
    throw new Error('Drop Model Error');
  }

  const newCompleteList = [...newCompleteListWithoutItem];
  // NOTE: splice does NOT return the updated array... :/
  newCompleteList.splice(newIndex, 0, itemId);

  return newCompleteList;
};
