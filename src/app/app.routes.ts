import { Routes } from '@angular/router';
import { ProjectTaskPageComponent } from './pages/project-task-page/project-task-page.component';
import { ConfigPageComponent } from './pages/config-page/config-page.component';
import { ProjectOverviewPageComponent } from './pages/project-overview-page/project-overview-page.component';
import { DailySummaryComponent } from './pages/daily-summary/daily-summary.component';
import { WorklogComponent } from './features/worklog/worklog.component';
import { MetricPageComponent } from './pages/metric-page/metric-page.component';
import { ProcrastinationComponent } from './features/procrastination/procrastination.component';
import { SchedulePageComponent } from './pages/schedule-page/schedule-page.component';
import { ProjectSettingsPageComponent } from './pages/project-settings-page/project-settings-page.component';
import { TagTaskPageComponent } from './pages/tag-task-page/tag-task-page.component';
import {
  ActiveWorkContextGuard,
  ValidProjectIdGuard,
  ValidTagIdGuard,
} from './app.guard';
import { TagSettingsPageComponent } from './pages/tag-settings-page/tag-settings-page.component';
import { TODAY_TAG } from './features/tag/tag.const';
import { TimelinePageComponent } from './pages/timeline-page/timeline-page.component';

export const APP_ROUTES: Routes = [
  { path: 'config', component: ConfigPageComponent, data: { page: 'config' } },
  { path: 'schedule', component: SchedulePageComponent, data: { page: 'schedule' } },
  {
    path: 'procrastination',
    component: ProcrastinationComponent,
    data: { page: 'procrastination' },
  },

  {
    path: 'timeline',
    component: TimelinePageComponent,
    data: { page: 'timeline' },
  },
  {
    path: 'tag/:id/tasks',
    component: TagTaskPageComponent,
    data: { page: 'tag-tasks' },
    canActivate: [ValidTagIdGuard],
  },
  {
    path: 'tag/:id/settings',
    component: TagSettingsPageComponent,
    data: { page: 'tag-settings' },
    canActivate: [ValidTagIdGuard],
  },
  {
    path: 'tag/:id/worklog',
    component: WorklogComponent,
    data: { page: 'worklog' },
    canActivate: [ValidTagIdGuard],
  },
  // {path: 'tag/:id/metrics', component: MetricPageComponent, data: {page: 'metrics'}, canActivate: [ValidContextIdGuard]},
  {
    path: 'tag/:id/daily-summary',
    component: DailySummaryComponent,
    data: { page: 'daily-summary' },
    canActivate: [ValidTagIdGuard],
  },
  {
    path: 'tag/:id/daily-summary/:dayStr',
    component: DailySummaryComponent,
    data: { page: 'daily-summary' },
    canActivate: [ValidTagIdGuard],
  },

  {
    path: 'project/:id/tasks',
    component: ProjectTaskPageComponent,
    data: { page: 'project-tasks' },
    canActivate: [ValidProjectIdGuard],
  },
  {
    path: 'project/:id/settings',
    component: ProjectSettingsPageComponent,
    data: { page: 'project-settings' },
    canActivate: [ValidProjectIdGuard],
  },
  {
    path: 'project/:id/worklog',
    component: WorklogComponent,
    data: { page: 'worklog' },
    canActivate: [ValidProjectIdGuard],
  },
  {
    path: 'project/:id/metrics',
    component: MetricPageComponent,
    data: { page: 'metrics' },
    canActivate: [ValidProjectIdGuard],
  },
  {
    path: 'project/:id/daily-summary',
    component: DailySummaryComponent,
    data: { page: 'daily-summary' },
    canActivate: [ValidProjectIdGuard],
  },
  {
    path: 'project/:id/daily-summary/:dayStr',
    component: DailySummaryComponent,
    data: { page: 'daily-summary' },
    canActivate: [ValidProjectIdGuard],
  },
  {
    path: 'project-overview',
    component: ProjectOverviewPageComponent,
    data: { page: 'project-overview' },
  },

  {
    path: 'active/:subPageType',
    canActivate: [ActiveWorkContextGuard],
    component: ConfigPageComponent,
  },
  {
    path: 'active/:subPageType/:param',
    canActivate: [ActiveWorkContextGuard],
    component: ConfigPageComponent,
  },
  {
    path: 'active',
    canActivate: [ActiveWorkContextGuard],
    component: ConfigPageComponent,
  },

  { path: '**', redirectTo: `tag/${TODAY_TAG.id}/tasks` },
];
