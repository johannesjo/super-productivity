import { createFeature, createReducer, on } from '@ngrx/store';
import { BoardsActions } from './boards.actions';
import { BoardCfg } from '../boards.model';
import { DEFAULT_BOARDS } from '../boards.const';

export const BOARDS_FEATURE_NAME = 'boards';

export interface BoardsState {
  boardCfgs: BoardCfg[];
}

export const initialBoardsState: BoardsState = {
  boardCfgs: DEFAULT_BOARDS,
};

export const boardsReducer = createReducer(
  initialBoardsState,
  on(BoardsActions.loadBoards, (state) => state),

  // on(BoardsActions.updatePanelCfg, (state, { panelCfg: panelCfgUpdate }) => {
  //   let panelCfgToUpdate;
  //   const boardCfg = state.boardCfgs.find((cfg) => {
  //     panelCfgToUpdate = cfg.panels.find((panel) => panel.id === panelCfgUpdate.id);
  //     return !!panelCfgToUpdate;
  //   });
  //
  //   if (boardCfg && panelCfgToUpdate) {
  //     return {
  //       ...state,
  //       boardCfgs: state.boardCfgs.map((boardCfgInner) => {
  //         if (boardCfgInner.id === boardCfg.id) {
  //           return {
  //             ...boardCfgInner,
  //             panels: boardCfgInner.panels.map((panel) => {
  //               if (panel.id === panelCfgUpdate.id) {
  //                 return {
  //                   ...panel,
  //                   ...panelCfgUpdate,
  //                 };
  //               }
  //               return panel;
  //             }),
  //           };
  //         }
  //         return boardCfgInner;
  //       }),
  //     };
  //   }
  //
  //   return state;
  // }),

  on(BoardsActions.updatePanelCfgTaskIds, (state, { panelId, taskIds }) => {
    let panelCfgToUpdate;
    const boardCfg = state.boardCfgs.find((cfg) => {
      panelCfgToUpdate = cfg.panels.find((panel) => panel.id === panelId);
      return !!panelCfgToUpdate;
    });

    if (boardCfg && panelCfgToUpdate) {
      return {
        ...state,
        boardCfgs: state.boardCfgs.map((boardCfgInner) => {
          if (boardCfgInner.id === boardCfg.id) {
            return {
              ...boardCfgInner,
              panels: boardCfgInner.panels.map((panel) => {
                if (panel.id === panelId) {
                  return {
                    ...panel,
                    taskIds,
                  };
                }
                return panel;
              }),
            };
          }
          return boardCfgInner;
        }),
      };
    }

    return state;
  }),
);

export const boardsFeature = createFeature({
  name: BOARDS_FEATURE_NAME,
  reducer: boardsReducer,
});
