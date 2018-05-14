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
import { StoreModule } from '@ngrx/store';
import { TaskReducer } from './tasks/task.reducer';
import { CurrentTaskReducer } from './tasks/current-task.reducer';
import { metaReducers } from './meta.reducer';
import { EffectsModule } from '@ngrx/effects';
import { TaskEffects } from './tasks/task.effects';
import { MarkdownModule } from 'ngx-markdown';
import { AddTaskBarComponent } from './add-task-bar/add-task-bar.component';
import { MatFormField } from '@angular/material';
import { MatAutocomplete } from '@angular/material';
import { MatFormFieldModule } from '@angular/material';
import { MatAutocompleteModule } from '@angular/material';
import { MatOptionModule } from '@angular/material';
import { FormControl } from '@angular/forms';
import { ReactiveFormsModule } from '@angular/forms';

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
    EditOnClickComponent,
    TaskComponent,
    InlineMarkdownComponent,

    // dialogs
    DialogTimeEstimateComponent,

    InputDurationDirective,

    DurationToStringPipe,
    DurationFromStringPipe,
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
    MatFormFieldModule,
    MatInputModule,
    MatAutocompleteModule,
    MatOptionModule,

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
    MarkdownModule.forRoot(),
  ],
  providers: [TaskService],
  bootstrap: [AppComponent]
})
export class AppModule {
}
