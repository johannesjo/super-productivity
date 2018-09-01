import 'hammerjs';
import { BrowserModule } from '@angular/platform-browser';
import { NgModule } from '@angular/core';
import { RouterModule } from '@angular/router';
import { BrowserAnimationsModule } from '@angular/platform-browser/animations';
import { AppComponent } from './app.component';
import { TaskService } from './tasks/task.service';
import { StoreModule } from '@ngrx/store';
import { UiModule } from './ui/ui.module';
import { TasksModule } from './tasks/tasks.module';
import { WorkViewModule } from './work-view/work-view.module';
import { APP_ROUTES } from './app.routes';
import { StoreDevtoolsModule } from '@ngrx/store-devtools';
import { environment } from '../environments/environment';
import { TaskEffects } from './tasks/store/task.effects';
import { EffectsModule } from '@ngrx/effects';


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
    // StoreModule.forRoot(reducers, {metaReducers}),
    // NOTE: both need to be present to use forFeature stores
    StoreModule.forRoot({}),
    EffectsModule.forRoot([]),
    !environment.production ? StoreDevtoolsModule.instrument() : [],


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
