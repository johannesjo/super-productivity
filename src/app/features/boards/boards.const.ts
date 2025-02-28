import { BoardCfg } from './boards.model';
import { IMPORTANT_TAG, IN_PROGRESS_TAG, URGENT_TAG } from '../tag/tag.const';
import { T } from '../../t.const';

// TODO translate strings
export const DEFAULT_BOARDS: BoardCfg[] = [
  {
    id: 'EISENHOWER_MATRIX',
    title: T.F.BOARDS.DEFAULT.EISENHAUER_MATRIX,
    cols: 2,
    rows: 2,
    panels: [
      {
        id: 'URGENT_AND_IMPORTANT',
        title: T.F.BOARDS.DEFAULT.URGENT_IMPORTANT,
        includedTagIds: [IMPORTANT_TAG.id, URGENT_TAG.id],
        taskIds: [],
      },
      {
        id: 'NOT_URGENT_AND_IMPORTANT',
        title: T.F.BOARDS.DEFAULT.NOT_URGENT_IMPORTANT,
        includedTagIds: [IMPORTANT_TAG.id],
        excludedTagIds: [URGENT_TAG.id],
        taskIds: [],
      },
      {
        id: 'URGENT_AND_NOT_IMPORTANT',
        title: T.F.BOARDS.DEFAULT.URGENT_NOT_IMPORTANT,
        includedTagIds: [URGENT_TAG.id],
        excludedTagIds: [IMPORTANT_TAG.id],
        taskIds: [],
      },
      {
        id: 'NOT_URGENT_AND_NOT_IMPORTANT',
        title: T.F.BOARDS.DEFAULT.NOT_URGENT_NOT_IMPORTANT,
        excludedTagIds: [IMPORTANT_TAG.id, URGENT_TAG.id],
        taskIds: [],
      },
    ],
  },
  {
    id: 'KANBAN_DEFAULT',
    title: T.F.BOARDS.DEFAULT.KANBAN,
    cols: 3,
    rows: 1,
    panels: [
      {
        id: 'TODO',
        title: T.F.BOARDS.DEFAULT.TO_DO,
        isUnDoneOnly: true,
        excludedTagIds: [IN_PROGRESS_TAG.id],
        taskIds: [],
      },
      {
        id: 'IN_PROGRESS',
        title: T.F.BOARDS.DEFAULT.IN_PROGRESS,
        isUnDoneOnly: true,
        includedTagIds: [IN_PROGRESS_TAG.id],
        taskIds: [],
      },
      {
        id: 'DONE',
        title: T.F.BOARDS.DEFAULT.DONE,
        isDoneOnly: true,
        excludedTagIds: [IN_PROGRESS_TAG.id],
        taskIds: [],
      },
    ],
  },
];
