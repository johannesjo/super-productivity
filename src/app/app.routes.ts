import { Routes } from '@angular/router';
import { ProjectTaskPageComponent } from './pages/project-task-page/project-task-page.component';
import { ConfigPageComponent } from './pages/config-page/config-page.component';
import { DailySummaryComponent } from './pages/daily-summary/daily-summary.component';
import { WorklogComponent } from './features/worklog/worklog.component';
import { MetricPageComponent } from './pages/metric-page/metric-page.component';
import { ScheduledListPageComponent } from './pages/scheduled-list-page/scheduled-list-page.component';
import { ProjectSettingsPageComponent } from './pages/project-settings-page/project-settings-page.component';
import { TagTaskPageComponent } from './pages/tag-task-page/tag-task-page.component';
import {
  ActiveWorkContextGuard,
  FocusOverlayOpenGuard,
  ValidProjectIdGuard,
  ValidTagIdGuard,
} from './app.guard';
import { TagSettingsPageComponent } from './pages/tag-settings-page/tag-settings-page.component';
import { TODAY_TAG } from './features/tag/tag.const';
import { QuickHistoryComponent } from './features/quick-history/quick-history.component';
import { PlannerComponent } from './features/planner/planner.component';
import { ScheduleComponent } from './features/schedule/schedule/schedule.component';
import { BoardsComponent } from './features/boards/boards.component';

export const APP_ROUTES: Routes = [
  {
    path: 'config',
    component: ConfigPageComponent,
    data: { page: 'config' },
    canActivate: [FocusOverlayOpenGuard],
  },
  {
    path: 'scheduled-list',
    component: ScheduledListPageComponent,
    data: { page: 'scheduled-list' },
    canActivate: [FocusOverlayOpenGuard],
  },
  {
    path: 'planner',
    component: PlannerComponent,
    data: { page: 'planner' },
    canActivate: [FocusOverlayOpenGuard],
  },
  {
    path: 'schedule',
    component: ScheduleComponent,
    data: { page: 'schedule' },
    canActivate: [FocusOverlayOpenGuard],
  },
  {
    path: 'boards',
    component: BoardsComponent,
    data: { page: 'boards' },
    canActivate: [FocusOverlayOpenGuard],
  },
  {
    path: 'tag/:id/tasks',
    component: TagTaskPageComponent,
    data: { page: 'tag-tasks' },
    canActivate: [ValidTagIdGuard, FocusOverlayOpenGuard],
  },
  {
    path: 'tag/:id/settings',
    component: TagSettingsPageComponent,
    data: { page: 'tag-settings' },
    canActivate: [ValidTagIdGuard, FocusOverlayOpenGuard],
  },
  {
    path: 'tag/:id/worklog',
    component: WorklogComponent,
    data: { page: 'worklog' },
    canActivate: [ValidTagIdGuard, FocusOverlayOpenGuard],
  },
  {
    path: 'tag/:id/quick-history',
    component: QuickHistoryComponent,
    data: { page: 'quick-history' },
    canActivate: [ValidTagIdGuard, FocusOverlayOpenGuard],
  },
  // {path: 'tag/:id/metrics', component: MetricPageComponent, data: {page: 'metrics'}, canActivate: [ValidContextIdGuard, FocusOverlayOpenGuard]},
  {
    path: 'tag/:id/daily-summary',
    component: DailySummaryComponent,
    data: { page: 'daily-summary' },
    canActivate: [ValidTagIdGuard, FocusOverlayOpenGuard],
  },
  {
    path: 'tag/:id/daily-summary/:dayStr',
    component: DailySummaryComponent,
    data: { page: 'daily-summary' },
    canActivate: [ValidTagIdGuard, FocusOverlayOpenGuard],
  },
  {
    path: 'tag/:id/metrics',
    component: MetricPageComponent,
    data: { page: 'metrics' },
    canActivate: [ValidTagIdGuard, FocusOverlayOpenGuard],
  },

  {
    path: 'project/:id/tasks',
    component: ProjectTaskPageComponent,
    data: { page: 'project-tasks' },
    canActivate: [ValidProjectIdGuard, FocusOverlayOpenGuard],
  },
  {
    path: 'project/:id/settings',
    component: ProjectSettingsPageComponent,
    data: { page: 'project-settings' },
    canActivate: [ValidProjectIdGuard, FocusOverlayOpenGuard],
  },
  {
    path: 'project/:id/worklog',
    component: WorklogComponent,
    data: { page: 'worklog' },
    canActivate: [ValidProjectIdGuard, FocusOverlayOpenGuard],
  },
  {
    path: 'project/:id/quick-history',
    component: QuickHistoryComponent,
    data: { page: 'quick-history' },
    canActivate: [ValidProjectIdGuard, FocusOverlayOpenGuard],
  },
  {
    path: 'project/:id/metrics',
    component: MetricPageComponent,
    data: { page: 'metrics' },
    canActivate: [ValidProjectIdGuard, FocusOverlayOpenGuard],
  },
  {
    path: 'project/:id/daily-summary',
    component: DailySummaryComponent,
    data: { page: 'daily-summary' },
    canActivate: [ValidProjectIdGuard, FocusOverlayOpenGuard],
  },
  {
    path: 'project/:id/daily-summary/:dayStr',
    component: DailySummaryComponent,
    data: { page: 'daily-summary' },
    canActivate: [ValidProjectIdGuard, FocusOverlayOpenGuard],
  },
  {
    path: 'active/:subPageType',
    canActivate: [ActiveWorkContextGuard, FocusOverlayOpenGuard],
    component: ConfigPageComponent,
  },
  {
    path: 'active/:subPageType/:param',
    canActivate: [ActiveWorkContextGuard, FocusOverlayOpenGuard],
    component: ConfigPageComponent,
  },
  {
    path: 'active',
    canActivate: [ActiveWorkContextGuard, FocusOverlayOpenGuard],
    component: ConfigPageComponent,
  },

  { path: '**', redirectTo: `tag/${TODAY_TAG.id}/tasks` },
];
