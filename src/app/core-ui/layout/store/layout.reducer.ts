import {
  hideAddTaskBar,
  hideNotesAndAddTaskPanel,
  hideSideNav,
  showAddTaskBar,
  toggleAddTaskBar,
  toggleIssuePanel,
  toggleShowNotes,
  toggleSideNav,
  toggleTaskViewCustomizerPanel,
  showPluginPanel,
  hidePluginPanel,
  togglePluginPanel,
} from './layout.actions';
import {
  Action,
  createFeatureSelector,
  createReducer,
  createSelector,
  on,
} from '@ngrx/store';

export const LAYOUT_FEATURE_NAME = 'layout';

export interface LayoutState {
  isShowAddTaskBar: boolean;
  isShowNotes: boolean;
  isShowIssuePanel: boolean;
  isShowSideNav: boolean;
  isShowCelebrate: boolean;
  isShowTaskViewCustomizerPanel: boolean;
  isShowPluginPanel: boolean;
  activePluginId: string | null;
}

const _initialLayoutState: LayoutState = {
  isShowAddTaskBar: false,
  isShowSideNav: false,
  isShowNotes: false,
  isShowIssuePanel: false,
  isShowCelebrate: false,
  isShowTaskViewCustomizerPanel: false,
  isShowPluginPanel: false,
  activePluginId: null,
};

export const selectLayoutFeatureState =
  createFeatureSelector<LayoutState>(LAYOUT_FEATURE_NAME);

export const selectIsShowAddTaskBar = createSelector(
  selectLayoutFeatureState,
  (state) => state.isShowAddTaskBar,
);

export const selectIsShowSideNav = createSelector(
  selectLayoutFeatureState,
  (state) => state.isShowSideNav,
);

export const selectIsShowNotes = createSelector(
  selectLayoutFeatureState,
  (state) => state.isShowNotes,
);

export const selectIsShowTaskViewCustomizerPanel = createSelector(
  selectLayoutFeatureState,
  (state) => state.isShowTaskViewCustomizerPanel,
);

export const selectIsShowIssuePanel = createSelector(
  selectLayoutFeatureState,
  (state) => state.isShowIssuePanel,
);

export const selectIsShowCelebrate = createSelector(
  selectLayoutFeatureState,
  (state) => state.isShowCelebrate,
);

export const selectIsShowPluginPanel = createSelector(
  selectLayoutFeatureState,
  (state) => state.isShowPluginPanel,
);

export const selectActivePluginId = createSelector(
  selectLayoutFeatureState,
  (state) => state.activePluginId,
);

const _reducer = createReducer<LayoutState>(
  _initialLayoutState,

  on(showAddTaskBar, (state) => ({ ...state, isShowAddTaskBar: true })),

  on(hideAddTaskBar, (state) => ({ ...state, isShowAddTaskBar: false })),

  on(toggleAddTaskBar, (state) => ({
    ...state,
    isShowAddTaskBar: !state.isShowAddTaskBar,
  })),

  on(hideSideNav, (state) => ({ ...state, isShowSideNav: false })),

  on(toggleSideNav, (state) => ({ ...state, isShowSideNav: !state.isShowSideNav })),

  on(toggleShowNotes, (state) => ({
    ...state,
    isShowNotes: !state.isShowNotes,
    isShowIssuePanel: false,
    isShowPluginPanel: false,
  })),

  on(toggleTaskViewCustomizerPanel, (state) => ({
    ...state,
    isShowTaskViewCustomizerPanel: !state.isShowTaskViewCustomizerPanel,
    isShowIssuePanel: false,
    isShowNotes: false,
    isShowPluginPanel: false,
  })),

  on(hideNotesAndAddTaskPanel, (state) => ({
    ...state,
    isShowNotes: false,
    isShowIssuePanel: false,
    isShowTaskViewCustomizerPanel: false,
    isShowPluginPanel: false,
  })),

  on(toggleIssuePanel, (state) => ({
    ...state,
    isShowIssuePanel: !state.isShowIssuePanel,
    isShowNotes: false,
    isShowPluginPanel: false,
  })),

  on(showPluginPanel, (state, { pluginId }) => ({
    ...state,
    isShowPluginPanel: true,
    activePluginId: pluginId,
    isShowNotes: false,
    isShowIssuePanel: false,
    isShowTaskViewCustomizerPanel: false,
  })),

  on(hidePluginPanel, (state) => ({
    ...state,
    isShowPluginPanel: false,
    activePluginId: null,
  })),

  on(togglePluginPanel, (state, { pluginId }) => {
    const isCurrentlyActive =
      state.activePluginId === pluginId && state.isShowPluginPanel;
    return {
      ...state,
      isShowPluginPanel: !isCurrentlyActive,
      activePluginId: isCurrentlyActive ? null : pluginId,
      isShowNotes: false,
      isShowIssuePanel: false,
      isShowTaskViewCustomizerPanel: false,
    };
  }),
);

export const layoutReducer = (
  state: LayoutState = _initialLayoutState,
  action: Action,
): LayoutState => _reducer(state, action);
