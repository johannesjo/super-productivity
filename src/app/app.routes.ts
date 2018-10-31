import { Routes } from '@angular/router';
import { WorkViewPageComponent } from './pages/work-view/work-view-page.component';
import { ConfigPageComponent } from './pages/config-page/config-page.component';
import { ProjectPageComponent } from './pages/project-page/project-page.component';
import { DailyPlannerComponent } from './pages/daily-planner/daily-planner.component';
import { DailySummaryComponent } from './pages/daily-summary/daily-summary.component';
import { HistoryAndCalendarComponent } from './pages/history-and-calendar/history-and-calendar.component';
import { HistoryComponent } from './pages/history-and-calendar/history/history.component';
import { CalendarComponent } from './pages/history-and-calendar/calendar/calendar.component';

export const APP_ROUTES: Routes = [
  {path: 'work-view', component: WorkViewPageComponent},
  {path: 'daily-planner', component: DailyPlannerComponent},
  {path: 'config', component: ConfigPageComponent},
  {path: 'projects', component: ProjectPageComponent},
  {path: 'daily-summary', component: DailySummaryComponent},
  {
    path: 'history-and-calendar',
    component: HistoryAndCalendarComponent,
    children: [
      {path: '', redirectTo: 'history', pathMatch: 'full'},
      {path: 'calendar', component: CalendarComponent},
      {path: 'history', component: HistoryComponent},
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
