import {Routes} from '@angular/router';
import {ProjectTaskPageComponent} from './pages/project-task-page/project-task-page.component';
import {ConfigPageComponent} from './pages/config-page/config-page.component';
import {ProjectPageComponent} from './pages/project-page/project-page.component';
import {DailySummaryComponent} from './pages/daily-summary/daily-summary.component';
import {WorklogComponent} from './features/worklog/worklog.component';
import {MetricPageComponent} from './pages/metric-page/metric-page.component';
import {ProcrastinationComponent} from './features/procrastination/procrastination.component';
import {SchedulePageComponent} from './pages/schedule-page/schedule-page.component';
import {ProjectSettingsComponent} from './pages/project-settings/project-settings.component';
import {TagTaskPageComponent} from './pages/tag-task-page/tag-task-page.component';

export const APP_ROUTES: Routes = [
  {path: 'config', component: ConfigPageComponent, data: {page: 'config'}},
  {path: 'projects', component: ProjectPageComponent, data: {page: 'projects'}},
  {path: 'schedule', component: SchedulePageComponent, data: {page: 'schedule'}},
  {path: 'metrics', component: MetricPageComponent, data: {page: 'metrics'}},
  {path: 'procrastination', component: ProcrastinationComponent, data: {page: 'procrastination'}},
  {path: 'daily-summary/:dayStr', component: DailySummaryComponent, data: {page: 'daily-summary'}},
  {path: 'daily-summary', component: DailySummaryComponent, data: {page: 'daily-summary'}},
  {path: 'worklog', component: WorklogComponent, data: {page: 'worklog'}},

  {path: 'tag/:id', component: TagTaskPageComponent, data: {page: 'tag'}},

  {path: 'project-settings', component: ProjectSettingsComponent, data: {page: 'project-settings'}},
  {path: 'project/:id', component: ProjectTaskPageComponent, data: {page: 'project'}},

  {path: '**', redirectTo: 'tag/MY_DAY'}
];
