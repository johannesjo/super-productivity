import { createFeatureSelector, createSelector } from '@ngrx/store';
import * as fromBoards from './boards.reducer';

export const selectBoardsState = createFeatureSelector<fromBoards.BoardsState>(
  fromBoards.BOARDS_FEATURE_NAME,
);

export const selectAllBoards = createSelector(
  selectBoardsState,
  (state) => state.boardCfgs,
);
