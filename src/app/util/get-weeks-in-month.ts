export interface WeeksInMonth {
  start: number;
  end: number;
}

// starting on monday
export const getWeeksInMonth = (month, year): WeeksInMonth[] => {
  const weeks = [];
  const firstDate = new Date(year, month, 1);
  const lastDate = new Date(year, month + 1, 0);

  const numDays = lastDate.getDate();

  let end = 7 - firstDate.getDay();
  let start = 1;
  if (firstDate.getDay() === 0) {
    end = 1;
  } else {
    end = 7 - firstDate.getDay() + 1;
  }
  while (start <= numDays) {
    weeks.push({start: start, end: end});
    start = end + 1;
    end = end + 7;
    end = (start === 1 && end === 8)
      ? 1
      : end;
    if (end > numDays) {
      end = numDays;
    }
  }
  return weeks;
};
