// starting on monday
import { WeeksInMonth } from './get-week-in-month-model';

export const getWeeksInMonth = (month: number, year: number): WeeksInMonth[] => {
  const weeks: { start: number; end: number }[] = [];
  const firstDate = new Date(year, month, 1);
  const lastDate = new Date(year, month + 1, 0);

  const numDays = lastDate.getDate();

  let end: number;
  let start: number = 1;

  if (firstDate.getDay() === 0) {
    end = 1;
  } else {
    end = 7 - firstDate.getDay() + 1;
  }
  while (start <= numDays) {
    weeks.push({ start, end });
    start = end + 1;
    end = end + 7;
    end = start === 1 && end === 8 ? 1 : end;
    if (end > numDays) {
      end = numDays;
    }
  }
  return weeks;
};
