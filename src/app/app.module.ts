import 'hammerjs';
import { BrowserModule } from '@angular/platform-browser';
import { NgModule } from '@angular/core';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { RouterModule, Routes } from '@angular/router';
import { BrowserAnimationsModule } from '@angular/platform-browser/animations';
import { DragulaModule } from 'ng2-dragula';
// import { MarkdownToHtmlModule } from 'ng2-markdown-to-html';
import { AppComponent } from './app.component';
// import { TaskReducer } from './tasks/task.reducer';
// import { CurrentTaskReducer } from './tasks/current-task.reducer';
// import { TaskEffects } from './tasks/task.effects';
// import { metaReducers } from './meta.reducer';
import { TaskService } from './tasks/task.service';
import { WorkViewComponent } from './work-view/work-view.component';
import { TaskListComponent } from './tasks/task-list/task-list.component';
import { TaskComponent } from './tasks/task/task.component';
import { DialogTimeEstimateComponent } from './dialogs/dialog-time-estimate/dialog-time-estimate.component';
import { KeysPipe } from './helper/keys.pipe';
import { ToArrayPipe } from './helper/to-array.pipe';
import { StoreModule } from '@ngrx/store';
import { TaskReducer } from './tasks/task.reducer';
import { CurrentTaskReducer } from './tasks/current-task.reducer';
import { metaReducers } from './meta.reducer';
import { EffectsModule } from '@ngrx/effects';
import { TaskEffects } from './tasks/task.effects';
import { MarkdownModule } from 'ngx-markdown';
import { AddTaskBarComponent } from './add-task-bar/add-task-bar.component';
import { UiModule } from './ui/ui.module';

export const appRoutes: Routes = [
  {path: 'work-view', component: WorkViewComponent},
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
  {path: '**', component: WorkViewComponent}
];


@NgModule({
  declarations: [
    AppComponent,
    AddTaskBarComponent,
    WorkViewComponent,
    TaskListComponent,
    TaskComponent,

    // dialogs
    DialogTimeEstimateComponent,


    KeysPipe,
    ToArrayPipe,
    AddTaskBarComponent
  ],
  entryComponents: [
    DialogTimeEstimateComponent,
  ],
  imports: [
    // base
    BrowserModule,
    FormsModule,
    ReactiveFormsModule,
    BrowserAnimationsModule,
    UiModule,
    RouterModule.forRoot(appRoutes, {useHash: true}),


    // store stuff
    StoreModule.forRoot({
        TaskReducer,
        CurrentTaskReducer
      },
      {metaReducers}
    ),
    EffectsModule.forRoot([TaskEffects]),


    // other
    DragulaModule,
  ],
  providers: [TaskService],
  bootstrap: [AppComponent]
})
export class AppModule {
}
