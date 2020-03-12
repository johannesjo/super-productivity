import {Routes} from '@angular/router';
import {WorkViewPageComponent} from './pages/work-view-page/work-view-page.component';
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
  {path: 'work-view', component: WorkViewPageComponent, data: {page: 'work-view'}},
  {path: 'config', component: ConfigPageComponent, data: {page: 'config'}},
  {path: 'projects', component: ProjectPageComponent, data: {page: 'projects'}},
  {path: 'schedule', component: SchedulePageComponent, data: {page: 'schedule'}},
  {path: 'metrics', component: MetricPageComponent, data: {page: 'metrics'}},
  {path: 'procrastination', component: ProcrastinationComponent, data: {page: 'procrastination'}},
  {path: 'daily-summary/:dayStr', component: DailySummaryComponent, data: {page: 'daily-summary'}},
  {path: 'tag/:id', component: TagTaskPageComponent, data: {page: 'tag'}},
  {path: 'daily-summary', component: DailySummaryComponent, data: {page: 'daily-summary'}},
  {path: 'worklog', component: WorklogComponent, data: {page: 'worklog'}},
  {path: 'project-settings', component: ProjectSettingsComponent, data: {page: 'project-settings'}},
  {path: '**', redirectTo: 'work-view'}
];
