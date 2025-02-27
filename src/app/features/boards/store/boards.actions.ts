/* eslint-disable @typescript-eslint/naming-convention */
import { createActionGroup, emptyProps, props } from '@ngrx/store';
import { BoardPanelCfg } from '../boards.model';

export const BoardsActions = createActionGroup({
  source: 'Boards',
  events: {
    'Load Boards': emptyProps(),
    'Update Panel Cfg': props<{ panelCfg: BoardPanelCfg }>(),
    'Update Panel Cfg TaskIds': props<{ panelId: string; taskIds: string[] }>(),
  },
});
