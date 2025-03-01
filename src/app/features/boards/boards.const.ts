import { BoardCfg, BoardPanelCfgTaskDoneState } from './boards.model';
import { IMPORTANT_TAG, IN_PROGRESS_TAG, URGENT_TAG } from '../tag/tag.const';
import { T } from '../../t.const';

// TODO translate strings
export const DEFAULT_BOARDS: BoardCfg[] = [
  {
    id: 'EISENHOWER_MATRIX',
    title: T.F.BOARDS.DEFAULT.EISENHAUER_MATRIX,
    cols: 2,
    panels: [
      {
        id: 'URGENT_AND_IMPORTANT',
        title: T.F.BOARDS.DEFAULT.URGENT_IMPORTANT,
        includedTagIds: [IMPORTANT_TAG.id, URGENT_TAG.id],
        excludedTagIds: [],
        taskIds: [],
        taskDoneState: BoardPanelCfgTaskDoneState.All,
      },
      {
        id: 'NOT_URGENT_AND_IMPORTANT',
        title: T.F.BOARDS.DEFAULT.NOT_URGENT_IMPORTANT,
        includedTagIds: [IMPORTANT_TAG.id],
        excludedTagIds: [URGENT_TAG.id],
        taskIds: [],
        taskDoneState: BoardPanelCfgTaskDoneState.All,
      },
      {
        id: 'URGENT_AND_NOT_IMPORTANT',
        title: T.F.BOARDS.DEFAULT.URGENT_NOT_IMPORTANT,
        includedTagIds: [URGENT_TAG.id],
        excludedTagIds: [IMPORTANT_TAG.id],
        taskIds: [],
        taskDoneState: BoardPanelCfgTaskDoneState.All,
      },
      {
        id: 'NOT_URGENT_AND_NOT_IMPORTANT',
        title: T.F.BOARDS.DEFAULT.NOT_URGENT_NOT_IMPORTANT,
        includedTagIds: [],
        excludedTagIds: [IMPORTANT_TAG.id, URGENT_TAG.id],
        taskIds: [],
        taskDoneState: BoardPanelCfgTaskDoneState.All,
      },
    ],
  },
  {
    id: 'KANBAN_DEFAULT',
    title: T.F.BOARDS.DEFAULT.KANBAN,
    cols: 3,
    panels: [
      {
        id: 'TODO',
        title: T.F.BOARDS.DEFAULT.TO_DO,
        taskDoneState: BoardPanelCfgTaskDoneState.UnDone,
        includedTagIds: [],
        excludedTagIds: [IN_PROGRESS_TAG.id],
        taskIds: [],
      },
      {
        id: 'IN_PROGRESS',
        title: T.F.BOARDS.DEFAULT.IN_PROGRESS,
        taskDoneState: BoardPanelCfgTaskDoneState.UnDone,
        includedTagIds: [IN_PROGRESS_TAG.id],
        excludedTagIds: [],
        taskIds: [],
      },
      {
        id: 'DONE',
        title: T.F.BOARDS.DEFAULT.DONE,
        taskDoneState: BoardPanelCfgTaskDoneState.Done,
        includedTagIds: [],
        excludedTagIds: [IN_PROGRESS_TAG.id],
        taskIds: [],
      },
    ],
  },
];

export const DEFAULT_BOARD_CFG: BoardCfg = {
  id: '',
  cols: 1,
  panels: [],
  title: '',
};
