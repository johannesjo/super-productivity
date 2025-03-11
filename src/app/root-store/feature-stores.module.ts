import { NgModule } from '@angular/core';
import { StoreModule } from '@ngrx/store';
import {
  BOOKMARK_FEATURE_NAME,
  bookmarkReducer,
} from '../features/bookmark/store/bookmark.reducer';
import { EffectsModule } from '@ngrx/effects';
import { BookmarkEffects } from '../features/bookmark/store/bookmark.effects';
import {
  LAYOUT_FEATURE_NAME,
  layoutReducer,
} from '../core-ui/layout/store/layout.reducer';
import { LayoutEffects } from '../core-ui/layout/store/layout.effects';
import {
  CONFIG_FEATURE_NAME,
  globalConfigReducer,
} from '../features/config/store/global-config.reducer';
import { GlobalConfigEffects } from '../features/config/store/global-config.effects';
import {
  FOCUS_MODE_FEATURE_KEY,
  focusModeReducer,
} from '../features/focus-mode/store/focus-mode.reducer';
import { FocusModeEffects } from '../features/focus-mode/store/focus-mode.effects';
import { IDLE_FEATURE_KEY, idleReducer } from '../features/idle/store/idle.reducer';
import { IdleEffects } from '../features/idle/store/idle.effects';
import {
  IMPROVEMENT_FEATURE_NAME,
  improvementReducer,
} from '../features/metric/improvement/store/improvement.reducer';
import { ImprovementEffects } from '../features/metric/improvement/store/improvement.effects';
import { issueProvidersFeature } from '../features/issue/store/issue-provider.reducer';
import { PollToBacklogEffects } from '../features/issue/store/poll-to-backlog.effects';
import { PollIssueUpdatesEffects } from '../features/issue/store/poll-issue-updates.effects';
import { IssueProviderDbEffects } from '../features/issue/store/issue-provider-db.effects';
import { UnlinkAllTasksOnProviderDeletionEffects } from '../features/issue/store/unlink-all-tasks-on-provider-deletion.effects';
import {
  METRIC_FEATURE_NAME,
  metricReducer,
} from '../features/metric/store/metric.reducer';
import { MetricEffects } from '../features/metric/store/metric.effects';
import { NOTE_FEATURE_NAME, noteReducer } from '../features/note/store/note.reducer';
import { NoteEffects } from '../features/note/store/note.effects';
import {
  OBSTRUCTION_FEATURE_NAME,
  obstructionReducer,
} from '../features/metric/obstruction/store/obstruction.reducer';
import { ObstructionEffects } from '../features/metric/obstruction/store/obstruction.effects';
import { plannerFeature } from '../features/planner/store/planner.reducer';
import { PlannerEffects } from '../features/planner/store/planner.effects';
import { PlannerInitialDialogEffects } from '../features/planner/store/planner-initial-dialog.effects';
import {
  POMODORO_FEATURE_NAME,
  pomodoroReducer,
} from '../features/pomodoro/store/pomodoro.reducer';
import { PomodoroEffects } from '../features/pomodoro/store/pomodoro.effects';
import {
  PROJECT_FEATURE_NAME,
  projectReducer,
} from '../features/project/store/project.reducer';
import { ProjectEffects } from '../features/project/store/project.effects';
import {
  SIMPLE_COUNTER_FEATURE_NAME,
  simpleCounterReducer,
} from '../features/simple-counter/store/simple-counter.reducer';
import { SimpleCounterEffects } from '../features/simple-counter/store/simple-counter.effects';
import { TAG_FEATURE_NAME, tagReducer } from '../features/tag/store/tag.reducer';
import { TagEffects } from '../features/tag/store/tag.effects';
import {
  TASK_REPEAT_CFG_FEATURE_NAME,
  taskRepeatCfgReducer,
} from '../features/task-repeat-cfg/store/task-repeat-cfg.reducer';
import { TaskRepeatCfgEffects } from '../features/task-repeat-cfg/store/task-repeat-cfg.effects';
import { TASK_FEATURE_NAME, taskReducer } from '../features/tasks/store/task.reducer';
import { TaskDbEffects } from '../features/tasks/store/task-db.effects';
import { TaskInternalEffects } from '../features/tasks/store/task-internal.effects';
import { TaskRelatedModelEffects } from '../features/tasks/store/task-related-model.effects';
import { TaskReminderEffects } from '../features/tasks/store/task-reminder.effects';
import { TaskUiEffects } from '../features/tasks/store/task-ui.effects';
import { ShortSyntaxEffects } from '../features/tasks/store/short-syntax.effects';
import { IS_ELECTRON } from '../app.constants';
import { TaskElectronEffects } from '../features/tasks/store/task-electron.effects';
import { WORK_CONTEXT_FEATURE_NAME } from '../features/work-context/store/work-context.selectors';
import { workContextReducer } from '../features/work-context/store/work-context.reducer';
import { WorkContextEffects } from '../features/work-context/store/work-context.effects';
import { IS_ANDROID_WEB_VIEW } from '../util/is-android-web-view';
import { AndroidEffects } from '../features/android/store/android.effects';
import { CaldavIssueEffects } from '../features/issue/providers/caldav/caldav-issue/caldav-issue.effects';
import { CalendarIntegrationEffects } from '../features/calendar-integration/store/calendar-integration.effects';
import { ElectronEffects } from '../core/electron/electron.effects';
import { DominaModeEffects } from '../features/domina-mode/store/domina-mode.effects';
import { DropboxEffects } from '../imex/sync/dropbox/store/dropbox.effects';
import { FinishDayBeforeCloseEffects } from '../features/finish-day-before-close/finish-day-before-close.effects';
import { GitlabIssueEffects } from '../features/issue/providers/gitlab/gitlab-issue/gitlab-issue.effects';
import { JiraIssueEffects } from '../features/issue/providers/jira/jira-issue/jira-issue.effects';
import { LocalBackupEffects } from '../imex/local-backup/local-backup.effects';
import { LocalFileSyncElectronEffects } from '../imex/sync/local-file-sync/store/local-file-sync-electron.effects';
import { OpenProjectEffects } from '../features/issue/providers/open-project/open-project-issue/store/open-project.effects';
import { ReminderCountdownEffects } from '../features/reminder/store/reminder-countdown.effects';
import { SyncEffects } from '../imex/sync/sync.effects';
import { LocalBackupService } from '../imex/local-backup/local-backup.service';
import { boardsFeature } from '../features/boards/store/boards.reducer';
import { BoardsEffects } from '../features/boards/store/boards.effects';

@NgModule({
  declarations: [],
  // TODO remove when possible
  providers: [LocalBackupService],
  imports: [
    StoreModule.forFeature(BOOKMARK_FEATURE_NAME, bookmarkReducer),
    EffectsModule.forFeature([BookmarkEffects]),

    StoreModule.forFeature(LAYOUT_FEATURE_NAME, layoutReducer),
    EffectsModule.forFeature([LayoutEffects]),

    StoreModule.forFeature(CONFIG_FEATURE_NAME, globalConfigReducer),
    EffectsModule.forFeature([GlobalConfigEffects]),

    StoreModule.forFeature(FOCUS_MODE_FEATURE_KEY, focusModeReducer),
    EffectsModule.forFeature([FocusModeEffects]),

    StoreModule.forFeature(IDLE_FEATURE_KEY, idleReducer),
    EffectsModule.forFeature([IdleEffects]),

    StoreModule.forFeature(IMPROVEMENT_FEATURE_NAME, improvementReducer),
    EffectsModule.forFeature([ImprovementEffects]),

    StoreModule.forFeature(issueProvidersFeature),
    EffectsModule.forFeature([
      PollToBacklogEffects,
      PollIssueUpdatesEffects,
      IssueProviderDbEffects,
      UnlinkAllTasksOnProviderDeletionEffects,
    ]),

    StoreModule.forFeature(METRIC_FEATURE_NAME, metricReducer),
    EffectsModule.forFeature([MetricEffects]),

    StoreModule.forFeature(NOTE_FEATURE_NAME, noteReducer),
    EffectsModule.forFeature([NoteEffects]),

    StoreModule.forFeature(OBSTRUCTION_FEATURE_NAME, obstructionReducer),
    EffectsModule.forFeature([ObstructionEffects]),

    StoreModule.forFeature(plannerFeature),
    EffectsModule.forFeature([PlannerEffects, PlannerInitialDialogEffects]),

    StoreModule.forFeature(POMODORO_FEATURE_NAME, pomodoroReducer),
    EffectsModule.forFeature([PomodoroEffects]),

    StoreModule.forFeature(PROJECT_FEATURE_NAME, projectReducer),
    EffectsModule.forFeature([ProjectEffects]),

    StoreModule.forFeature(SIMPLE_COUNTER_FEATURE_NAME, simpleCounterReducer),
    EffectsModule.forFeature([SimpleCounterEffects]),

    StoreModule.forFeature(TAG_FEATURE_NAME, tagReducer),
    EffectsModule.forFeature([TagEffects]),

    StoreModule.forFeature(TASK_REPEAT_CFG_FEATURE_NAME, taskRepeatCfgReducer),
    EffectsModule.forFeature([TaskRepeatCfgEffects]),

    StoreModule.forFeature(TASK_FEATURE_NAME, taskReducer),
    EffectsModule.forFeature([
      TaskDbEffects,
      TaskInternalEffects,
      TaskRelatedModelEffects,
      TaskReminderEffects,
      TaskUiEffects,
      ShortSyntaxEffects,
      ...(IS_ELECTRON ? [TaskElectronEffects] : []),
    ]),

    StoreModule.forFeature(WORK_CONTEXT_FEATURE_NAME, workContextReducer),
    EffectsModule.forFeature([WorkContextEffects]),

    StoreModule.forFeature(boardsFeature),
    EffectsModule.forFeature([BoardsEffects]),

    // EFFECTS ONLY
    EffectsModule.forFeature([...(IS_ANDROID_WEB_VIEW ? [AndroidEffects] : [])]),
    EffectsModule.forFeature([CaldavIssueEffects]),
    EffectsModule.forFeature([CalendarIntegrationEffects]),
    EffectsModule.forFeature([ElectronEffects]),
    EffectsModule.forFeature([PomodoroEffects, DominaModeEffects]),
    EffectsModule.forFeature([DropboxEffects]),
    EffectsModule.forFeature([FinishDayBeforeCloseEffects]),
    EffectsModule.forFeature([GitlabIssueEffects]),
    EffectsModule.forFeature([JiraIssueEffects]),
    EffectsModule.forFeature([LocalBackupEffects]),
    EffectsModule.forFeature([LocalFileSyncElectronEffects]),
    EffectsModule.forFeature([OpenProjectEffects]),
    EffectsModule.forFeature([ReminderCountdownEffects]),
    EffectsModule.forFeature([SyncEffects]),
  ],
})
export class FeatureStoresModule {}
