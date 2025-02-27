import { BoardCfg } from './boards.model';
import {
  IMPORTANT_TAG,
  NOT_IMPORTANT_TAG,
  NOT_URGENT_TAG,
  URGENT_TAG,
} from '../tag/tag.const';

// TODO translate strings
export const DEFAULT_BOARDS: BoardCfg[] = [
  {
    id: 'EISENHOWER_MATRIX',
    title: 'Eisenhauer Matrix',
    cols: 2,
    rows: 2,
    panels: [
      {
        id: 'URGENT_AND_IMPORTANT',
        title: 'Urgent & Important',
        tagIds: [IMPORTANT_TAG.id, URGENT_TAG.id],
      },
      {
        id: 'NOT_URGENT_AND_IMPORTANT',
        title: 'Not Urgent & Important',
        tagIds: [IMPORTANT_TAG.id, NOT_URGENT_TAG.id],
      },
      {
        id: 'URGENT_AND_NOT_IMPORTANT',
        title: 'Urgent & Not Important',
        tagIds: [URGENT_TAG.id, NOT_IMPORTANT_TAG.id],
      },
      {
        id: 'NOT_URGENT_AND_NOT_IMPORTANT',
        title: 'Not Urgent & Not Important',
        tagIds: [NOT_URGENT_TAG.id, NOT_IMPORTANT_TAG.id],
      },
    ],
  },
  {
    id: 'KANBAN_DEFAULT',
    title: 'Kanban',
    cols: 3,
    rows: 1,
    panels: [
      {
        id: 'TODO',
        title: 'To Do',
        // TODO add all task state stuff
        tagIds: [],
      },
      {
        id: 'DOING',
        title: 'Doing',
        tagIds: [],
      },
      {
        id: 'DONE',
        title: 'Done',
        tagIds: [],
      },
    ],
  },
];
