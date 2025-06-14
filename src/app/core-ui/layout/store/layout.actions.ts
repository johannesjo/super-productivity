import { createAction } from '@ngrx/store';

export const showTaskViewCustomizerPanel = createAction(
  '[Layout] Show TaskViewCustomizerPanel',
);

export const hideTaskViewCustomizerPanel = createAction(
  '[Layout] Hide TaskViewCustomizerPanel',
);

export const toggleTaskViewCustomizerPanel = createAction(
  '[Layout] Toggle TaskViewCustomizerPanel',
);

export const showAddTaskBar = createAction('[Layout] Show AddTaskBar');

export const hideAddTaskBar = createAction('[Layout] Hide AddTaskBar');

export const toggleAddTaskBar = createAction('[Layout] Toggle AddTaskBar');

export const hideSideNav = createAction('[Layout] Hide SideBar');

export const toggleSideNav = createAction('[Layout] Toggle SideBar');

export const toggleShowNotes = createAction('[Layout] ToggleShow Notes');

export const hideNotesAndAddTaskPanel = createAction('[Layout] Hide Notes');

export const toggleIssuePanel = createAction('[Layout] Toggle IssuePanel');

export const hideIssuePanel = createAction('[Layout] Hide IssuePanel');
