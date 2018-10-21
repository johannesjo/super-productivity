export const calcTotalTimeSpent = (timeSpentOnDay) => {
  let totalTimeSpent = 0;
  Object.keys(timeSpentOnDay).forEach(strDate => {
    if (timeSpentOnDay[strDate]) {
      totalTimeSpent += parseInt(timeSpentOnDay[strDate], 10);
    }
  });
  return totalTimeSpent;
};
