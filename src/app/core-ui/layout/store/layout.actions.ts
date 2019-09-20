import {createAction} from '@ngrx/store';


export const showAddTaskBar = createAction(
  '[Layout] Show AddTaskBar',
);

export const hideAddTaskBar = createAction(
  '[Layout] Hide AddTaskBar',
);

export const toggleAddTaskBar = createAction(
  '[Layout] Toggle AddTaskBar',
);

export const toggleSideBar = createAction(
  '[Layout] Toggle SideBar',
);


export const toggleShowNotes = createAction(
  '[Layout] ToggleShow Notes',
);

export const hideNotes = createAction(
  '[Layout] Hide Notes',
);

