import 'hammerjs';
import { BrowserModule } from '@angular/platform-browser';
import { NgModule } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterModule, Routes } from '@angular/router';
import { BrowserAnimationsModule } from '@angular/platform-browser/animations';
import {
  MatButtonModule,
  MatCheckboxModule,
  MatDatepickerModule,
  MatDialogModule,
  MatIconModule,
  MatInputModule,
  MatNativeDateModule,
  MatProgressBarModule,
  MatToolbarModule
} from '@angular/material';
import { DragulaModule } from 'ng2-dragula';
// import { MarkdownToHtmlModule } from 'ng2-markdown-to-html';
import { AppComponent } from './app.component';

// import { TaskReducer } from './tasks/task.reducer';
// import { CurrentTaskReducer } from './tasks/current-task.reducer';
// import { TaskEffects } from './tasks/task.effects';
// import { metaReducers } from './meta.reducer';
import { TaskService } from './tasks/task.service';
import { WorkViewComponent } from './work-view/work-view.component';
import { TaskListComponent } from './tasks/task-list.component';
import { EditOnClickComponent } from './edit-on-click/edit-on-click.component';
import { TaskComponent } from './tasks/task.component';
import { InlineMarkdownComponent } from './inline-markdown/inline-markdown.component';
import { DialogTimeEstimateComponent } from './dialogs/dialog-time-estimate/dialog-time-estimate.component';
import { InputDurationDirective } from './duration/input-duration.directive';
import { DurationToStringPipe } from './duration/duration-to-string.pipe';
import { DurationFromStringPipe } from './duration/duration-from-string.pipe';
import { KeysPipe } from './helper/keys.pipe';
import { ToArrayPipe } from './helper/to-array.pipe';

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
    WorkViewComponent,
    TaskListComponent,
    EditOnClickComponent,
    TaskComponent,
    InlineMarkdownComponent,

    // dialogs
    DialogTimeEstimateComponent,

    InputDurationDirective,

    DurationToStringPipe,
    DurationFromStringPipe,
    KeysPipe,
    ToArrayPipe
  ],
  entryComponents: [
    DialogTimeEstimateComponent,
  ],
  imports: [
    // base
    BrowserModule,
    FormsModule,
    BrowserAnimationsModule,
    RouterModule.forRoot(appRoutes, {useHash: true}),

    // material2
    MatToolbarModule,
    MatButtonModule,
    MatCheckboxModule,
    MatProgressBarModule,
    MatDialogModule,
    MatInputModule,
    MatIconModule,
    MatDatepickerModule,
    MatNativeDateModule,

    // other
    DragulaModule,
    // MarkdownToHtmlModule.forRoot(),
  ],
  providers: [TaskService],
  bootstrap: [AppComponent]
})
export class AppModule {
}
