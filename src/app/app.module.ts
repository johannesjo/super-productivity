import 'hammerjs';
import { BrowserModule } from '@angular/platform-browser';
import { NgModule } from '@angular/core';
import { RouterModule } from '@angular/router';
import { BrowserAnimationsModule } from '@angular/platform-browser/animations';
import { AppComponent } from './app.component';
import { TaskService } from './tasks/task.service';
import { StoreModule } from '@ngrx/store';
import { TaskReducer } from './tasks/task.reducer';
import { CurrentTaskReducer } from './tasks/current-task.reducer';
import { metaReducers } from './meta.reducer';
import { EffectsModule } from '@ngrx/effects';
import { TaskEffects } from './tasks/task.effects';
import { UiModule } from './ui/ui.module';
import { TasksModule } from './tasks/tasks.module';
import { WorkViewModule } from './work-view/work-view.module';
import { APP_ROUTES } from './app.routes';


@NgModule({
  declarations: [
    AppComponent,
  ],
  entryComponents: [],
  imports: [
    // base
    BrowserModule,
    BrowserAnimationsModule,
    RouterModule.forRoot(APP_ROUTES, {useHash: true}),

    // store stuff
    StoreModule.forRoot({
        TaskReducer,
        CurrentTaskReducer
      },
      {metaReducers}
    ),
    EffectsModule.forRoot([TaskEffects]),


    // local
    UiModule,
    TasksModule,
    WorkViewModule,
  ],
  providers: [TaskService],
  bootstrap: [AppComponent]
})
export class AppModule {
}
