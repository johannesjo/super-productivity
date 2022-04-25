// starting on monday
import { WeeksInMonth } from './get-week-in-month-model';

export const getWeeksInMonth = (
  month: number,
  year: number,
  firstDayOfWeek: number = 1,
): WeeksInMonth[] => {
  const weeks: { start: number; end: number }[] = [];
  const firstDate = new Date(year, month, 1);
  const lastDate = new Date(year, month + 1, 0);

  const numDays = lastDate.getDate();

  const diff = (7 - (firstDayOfWeek - 1)) % 7;
  let end: number;
  let start: number = 1;

  if ((firstDate.getDay() + diff) % 7 === 0) {
    end = 1;
  } else {
    end = 7 - ((firstDate.getDay() + diff) % 7) + 1;
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
