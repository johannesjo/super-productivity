import { Project } from '../../project/project.model';
import { Tag } from '../../tag/tag.model';

export interface AddTaskBarState {
  project: Project | null;
  tags: Tag[];
  date: Date | null;
  time: string | null;
  estimate: number | null;
  newTagTitles: string[];
  cleanText: string | null;
}

export const DATE_OPTIONS = [
  {
    label: 'Today',
    icon: 'today',
    getDate: () => {
      const date = new Date();
      date.setHours(0, 0, 0, 0);
      return date;
    },
  },
  {
    label: 'Tomorrow',
    icon: 'event',
    getDate: () => {
      const date = new Date();
      date.setDate(date.getDate() + 1);
      date.setHours(0, 0, 0, 0);
      return date;
    },
  },
  {
    label: 'Next Week',
    icon: 'next_week',
    getDate: () => {
      const date = new Date();
      date.setDate(date.getDate() + 7);
      date.setHours(0, 0, 0, 0);
      return date;
    },
  },
];

export const TIME_OPTIONS = [
  '08:00',
  '09:00',
  '10:00',
  '11:00',
  '12:00',
  '13:00',
  '14:00',
  '15:00',
  '16:00',
  '17:00',
  '18:00',
  '19:00',
  '20:00',
];

export const ESTIMATE_OPTIONS = [
  { label: '5m', value: '5m' },
  { label: '10m', value: '10m' },
  { label: '15m', value: '15m' },
  { label: '30m', value: '30m' },
  { label: '1h', value: '1h' },
  { label: '2h', value: '2h' },
  { label: '3h', value: '3h' },
  { label: '4h', value: '4h' },
  { label: '8h', value: '8h' },
];

export const INITIAL_ADD_TASK_BAR_STATE: AddTaskBarState = {
  project: null,
  tags: [],
  date: null,
  time: null,
  estimate: null,
  newTagTitles: [],
  cleanText: null,
};

export const CHRONO_SUGGESTIONS: string[] = [
  // Relative Days
  'today',
  'tomorrow',
  'yesterday',
  'tonight',
  'this morning',
  'this afternoon',
  'this evening',

  // Relative Weeks
  'next week',
  'last week',
  'this week',
  'next weekend',
  'last weekend',

  // Days of Week
  'monday',
  'tuesday',
  'wednesday',
  'thursday',
  'friday',
  'saturday',
  'sunday',
  'next monday',
  'next friday',
  'last monday',
  'last friday',

  // Months
  'january',
  'february',
  'march',
  'april',
  'may',
  'june',
  'july',
  'august',
  'september',
  'october',
  'november',
  'december',
  'next january',
  'last december',

  // Relative Time
  'in 5 minutes',
  'in 15 minutes',
  'in 30 minutes',
  'in 1 hour',
  'in 2 hours',
  'in 3 hours',
  'in 1 day',
  'in 2 days',
  'in 3 days',
  'in 1 week',
  'in 2 weeks',
  'in 1 month',

  // Absolute Times
  'at 7am',
  'at 9am',
  'at noon',
  'at 3pm',
  'at 5pm',
  'at 7pm',
  'at 9pm',
  'at midnight',

  // Special
  'now',
  'asap',
  'later',
  'soon',
  'end of day',
  'end of week',
  'end of month',
  'end of year',
];
