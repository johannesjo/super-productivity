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
  { label: '20m', value: '20m' },
  { label: '30m', value: '30m' },
  { label: '45m', value: '45m' },
  { label: '1h', value: '1h' },
  { label: '1.5h', value: '1h 30m' },
  { label: '2h', value: '2h' },
  { label: '3h', value: '3h' },
  { label: '4h', value: '4h' },
  { label: '5h', value: '5h' },
  { label: '6h', value: '6h' },
  { label: '8h', value: '8h' },
];
