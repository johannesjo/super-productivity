import { Routes } from '@angular/router';
import { WorkViewPageComponent } from './pages/work-view/work-view-page.component';
import { ConfigPageComponent } from './pages/config-page/config-page.component';
import { ProjectPageComponent } from './pages/project-page/project-page.component';

export const APP_ROUTES: Routes = [
  {path: 'work-view', component: WorkViewPageComponent},
  {path: 'config', component: ConfigPageComponent},
  {path: 'projects', component: ProjectPageComponent},
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
