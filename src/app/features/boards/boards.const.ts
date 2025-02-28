import { BoardCfg } from './boards.model';
import { IMPORTANT_TAG, URGENT_TAG } from '../tag/tag.const';

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
        includedTagIds: [IMPORTANT_TAG.id, URGENT_TAG.id],
        taskIds: [],
      },
      {
        id: 'NOT_URGENT_AND_IMPORTANT',
        title: 'Not Urgent & Important',
        includedTagIds: [IMPORTANT_TAG.id],
        excludedTagIds: [URGENT_TAG.id],
        taskIds: [],
      },
      {
        id: 'URGENT_AND_NOT_IMPORTANT',
        title: 'Urgent & Not Important',
        includedTagIds: [URGENT_TAG.id],
        excludedTagIds: [IMPORTANT_TAG.id],
        taskIds: [],
      },
      {
        id: 'NOT_URGENT_AND_NOT_IMPORTANT',
        title: 'Not Urgent & Not Important',
        excludedTagIds: [IMPORTANT_TAG.id, URGENT_TAG.id],
        taskIds: [],
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
        includedTagIds: [],
        taskIds: [],
      },
      {
        id: 'DOING',
        title: 'Doing',
        includedTagIds: [],
        taskIds: [],
      },
      {
        id: 'DONE',
        title: 'Done',
        includedTagIds: [],
        taskIds: [],
      },
    ],
  },
];
