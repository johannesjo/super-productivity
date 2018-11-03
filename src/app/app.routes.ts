import { Routes } from '@angular/router';
import { WorkViewPageComponent } from './pages/work-view/work-view-page.component';
import { ConfigPageComponent } from './pages/config-page/config-page.component';
import { ProjectPageComponent } from './pages/project-page/project-page.component';
import { DailyPlannerComponent } from './pages/daily-planner/daily-planner.component';
import { DailySummaryComponent } from './pages/daily-summary/daily-summary.component';
import { WorklogAndCalendarComponent } from './pages/worklog-and-calendar/worklog-and-calendar.component';
import { WorklogComponent } from './pages/worklog-and-calendar/worklog/worklog.component';
import { CalendarComponent } from './pages/worklog-and-calendar/calendar/calendar.component';

export const APP_ROUTES: Routes = [
  {path: 'work-view', component: WorkViewPageComponent},
  {path: 'config', component: ConfigPageComponent},
  {path: 'projects', component: ProjectPageComponent},
  {path: 'daily-summary', component: DailySummaryComponent},
  {
    path: 'worklog-and-calendar',
    component: WorklogAndCalendarComponent,
    children: [
      {path: '', redirectTo: 'worklog', pathMatch: 'full'},
      {path: 'calendar', component: CalendarComponent},
      {path: 'worklog', component: WorklogComponent},
    ]
  },
  // {path: 'hero/:id', component: HeroDetailComponent},
  // {
  //   path: 'heroes',
  //   component: HeroListComponent,
  //   data: {title: 'Heroes List'}
  // },
  // {
  //   path: '',
  //   redirectTo: '/heroes',
  //   pathMatch: 'full'
  // },
  {path: '**', component: WorkViewPageComponent}
];
