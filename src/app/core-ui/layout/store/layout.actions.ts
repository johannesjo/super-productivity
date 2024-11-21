import { createAction } from '@ngrx/store';

export const showAddTaskBar = createAction('[Layout] Show AddTaskBar');

export const hideAddTaskBar = createAction('[Layout] Hide AddTaskBar');

export const toggleAddTaskBar = createAction('[Layout] Toggle AddTaskBar');

export const showSearchBar = createAction('[Layout] Show SearchBar');

export const hideSearchBar = createAction('[Layout] Hide SearchBar');

export const toggleSearchBar = createAction('[Layout] Toggle SearchBar');

export const hideSideNav = createAction('[Layout] Hide SideBar');

export const toggleSideNav = createAction('[Layout] Toggle SideBar');

export const toggleShowNotes = createAction('[Layout] ToggleShow Notes');

export const hideNotesAndAddTaskPanel = createAction('[Layout] Hide Notes');

export const toggleIssuePanel = createAction('[Layout] Toggle IssuePanel');

export const hideIssuePanel = createAction('[Layout] Hide IssuePanel');
