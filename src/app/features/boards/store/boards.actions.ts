/* eslint-disable @typescript-eslint/naming-convention */
import { createActionGroup, props } from '@ngrx/store';
import { BoardCfg, BoardPanelCfg, BoardPanelSortCfg, BoardPanelGroupCfg } from '../boards.model';

export const BoardsActions = createActionGroup({
  source: 'Boards',
  events: {
    'Add Board': props<{ board: BoardCfg }>(),
    'Update Board': props<{ id: string; updates: Partial<BoardCfg> }>(),
    'Remove Board': props<{ id: string }>(),
    'Update Panel Cfg': props<{ panelCfg: BoardPanelCfg }>(),
    'Update Panel Cfg TaskIds': props<{ panelId: string; taskIds: string[] }>(),
    'Update Panel Sort Config': props<{ panelId: string; sortCfg: BoardPanelSortCfg }>(),
    'Update Panel Group Config': props<{ panelId: string; groupCfg: BoardPanelGroupCfg }>(),
  },
});
