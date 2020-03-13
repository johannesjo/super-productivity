import {Routes} from '@angular/router';
import {ProjectTaskPageComponent} from './pages/project-task-page/project-task-page.component';
import {ConfigPageComponent} from './pages/config-page/config-page.component';
import {ProjectOverviewPageComponent} from './pages/project-overview-page/project-overview-page.component';
import {DailySummaryComponent} from './pages/daily-summary/daily-summary.component';
import {WorklogComponent} from './features/worklog/worklog.component';
import {MetricPageComponent} from './pages/metric-page/metric-page.component';
import {ProcrastinationComponent} from './features/procrastination/procrastination.component';
import {SchedulePageComponent} from './pages/schedule-page/schedule-page.component';
import {ProjectSettingsPageComponent} from './pages/project-settings/project-settings-page.component';
import {TagTaskPageComponent} from './pages/tag-task-page/tag-task-page.component';
import {ActiveWorkContextGuard} from './app.guard';
import {TagSettingsPageComponent} from './pages/tag-settings-page/tag-settings-page.component';

export const APP_ROUTES: Routes = [
  {path: 'config', component: ConfigPageComponent, data: {page: 'config'}},
  {path: 'schedule', component: SchedulePageComponent, data: {page: 'schedule'}},
  {path: 'procrastination', component: ProcrastinationComponent, data: {page: 'procrastination'}},

  {path: 'tag/:id/tasks', component: TagTaskPageComponent, data: {page: 'tag-tasks'}},
  {path: 'tag/:id/settings', component: TagSettingsPageComponent, data: {page: 'tag-settings'}},

  {path: 'project/:id/tasks', component: ProjectTaskPageComponent, data: {page: 'project-tasks'}},
  {path: 'project/:id/settings', component: ProjectSettingsPageComponent, data: {page: 'project-settings'}},
  {path: 'project-overview', component: ProjectOverviewPageComponent, data: {page: 'project-overview'}},

  {path: 'daily-summary/:dayStr', component: DailySummaryComponent, data: {page: 'daily-summary'}},
  {path: 'daily-summary', component: DailySummaryComponent, data: {page: 'daily-summary'}},

  {path: 'metrics', component: MetricPageComponent, data: {page: 'metrics'}},
  {path: 'worklog', component: WorklogComponent, data: {page: 'worklog'}},

  {path: 'active/:sub-page-type', canActivate: [ActiveWorkContextGuard], component: ConfigPageComponent},
  {path: 'active', canActivate: [ActiveWorkContextGuard], component: ConfigPageComponent},

  {path: '**', redirectTo: 'tag/MY_DAY/tasks'}
];
