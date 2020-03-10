import {createAction, props} from '@ngrx/store';
import {Update} from '@ngrx/entity';
import {IntelligentList, IntelligentListState} from '../intelligent-list.model';

export const loadIntelligentListState = createAction(
  '[IntelligentList] Load IntelligentList State',
  props<{ state: IntelligentListState }>(),
);

export const addIntelligentList = createAction(
  '[IntelligentList] Add IntelligentList',
  props<{ intelligentList: IntelligentList }>(),
);

export const updateIntelligentList = createAction(
  '[IntelligentList] Update IntelligentList',
  props<{ intelligentList: Update<IntelligentList> }>(),
);

export const upsertIntelligentList = createAction(
  '[IntelligentList] Upsert IntelligentList',
  props<{ intelligentList: IntelligentList }>(),
);

export const deleteIntelligentList = createAction(
  '[IntelligentList] Delete IntelligentList',
  props<{ id: string }>(),
);

export const deleteIntelligentLists = createAction(
  '[IntelligentList] Delete multiple IntelligentLists',
  props<{ ids: string[] }>(),
);
