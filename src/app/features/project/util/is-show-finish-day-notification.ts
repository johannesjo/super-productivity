export const isShowFinishDayNotification = (lastWorkEndTimestamp: number, lastCompletedDayStr: string, today = new Date()): boolean => {
  const lastWorkEnd = new Date(lastWorkEndTimestamp);
  const lastCompletedDay = new Date(lastCompletedDayStr);

  today.setHours(0, 0, 0, 0);
  lastWorkEnd.setHours(0, 0, 0, 0);
  lastCompletedDay.setHours(0, 0, 0, 0);

  // NOTE: ignore projects without any completed day
  return !!(lastCompletedDay)
    && (lastWorkEnd < today)
    && (lastWorkEnd > lastCompletedDay);
};
