export const mapEstimateRemainingFromTasks = (tasks): number => tasks && tasks.length && tasks.reduce((acc, task) => {
  let isTrackVal;
  let estimateRemaining;
  if (task.subTasks && task.subTasks.length > 0) {
    estimateRemaining = task.subTasks.reduce((subAcc, subTask) => {
      const estimateRemainingSub = (+subTask.timeEstimate) - (+subTask.timeSpent);
      const isTrackValSub = ((estimateRemainingSub > 0) && !subTask.isDone);
      return subAcc + ((isTrackValSub) ? estimateRemainingSub : 0);
    }, 0);
  } else {
    estimateRemaining = (+task.timeEstimate) - (+task.timeSpent);
  }
  isTrackVal = ((estimateRemaining > 0) && !task.isDone);
  return acc + ((isTrackVal) ? estimateRemaining : 0);
}, 0);
