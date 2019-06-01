import {BrowserModule, HAMMER_GESTURE_CONFIG} from '@angular/platform-browser';
import {ErrorHandler, NgModule} from '@angular/core';
import {AppComponent} from './app.component';
import {ServiceWorkerModule} from '@angular/service-worker';
import {environment} from '../environments/environment';
import {StoreModule} from '@ngrx/store';
import {EffectsModule} from '@ngrx/effects';
import {StoreDevtoolsModule} from '@ngrx/store-devtools';
import {BrowserAnimationsModule} from '@angular/platform-browser/animations';
import {RouterModule} from '@angular/router';
import {APP_ROUTES} from './app.routes';
import {UiModule} from './ui/ui.module';
import {reducers} from './root-store';
import {CoreModule} from './core/core.module';
import {ReactiveFormsModule} from '@angular/forms';
import {FormlyModule} from '@ngx-formly/core';
import {FormlyMaterialModule} from '@ngx-formly/material';
import {PagesModule} from './pages/pages.module';
import {MainHeaderModule} from './core-ui/main-header/main-header.module';
import {HttpClientModule} from '@angular/common/http';
import { MatSidenavModule } from '@angular/material/sidenav';
import {TasksModule} from './features/tasks/tasks.module';
import {TimeTrackingModule} from './features/time-tracking/time-tracking.module';
import {BookmarkModule} from './features/bookmark/bookmark.module';
import {NoteModule} from './features/note/note.module';
import {ReminderModule} from './features/reminder/reminder.module';
import {CoreUiModule} from './core-ui/core-ui.module';
import {MigrateModule} from './imex/migrate/migrate.module';
import {GlobalErrorHandler} from './core/error-handler/global-error-handler.class';
import {MyHammerConfig} from '../hammer-config.class';

@NgModule({
  declarations: [
    AppComponent,
  ],
  imports: [
    // Local
    CoreModule,
    UiModule,
    CoreUiModule,
    PagesModule,
    MainHeaderModule,
    BookmarkModule,
    MatSidenavModule,
    TasksModule,
    TimeTrackingModule,
    NoteModule,
    ReminderModule,
    MigrateModule,
    CoreUiModule,

    // External
    BrowserModule,
    BrowserAnimationsModule,
    HttpClientModule,
    RouterModule.forRoot(APP_ROUTES, {useHash: true}),
    // NOTE: both need to be present to use forFeature stores
    StoreModule.forRoot(reducers),
    EffectsModule.forRoot([]),
    !environment.production ? StoreDevtoolsModule.instrument() : [],
    ReactiveFormsModule,
    FormlyModule.forRoot({
      extras: {
        immutable: true
      },
      validationMessages: [
        {name: 'required', message: 'This field is required'},
        {name: 'pattern', message: 'Invalid input'},
      ],
    }),
    FormlyMaterialModule,
    ServiceWorkerModule.register('ngsw-worker.js', {enabled: environment.production}),
    NoteModule,
  ],
  bootstrap: [AppComponent],
  providers: [
    {provide: ErrorHandler, useClass: GlobalErrorHandler},
    {provide: HAMMER_GESTURE_CONFIG, useClass: MyHammerConfig}
  ],
})
export class AppModule {
}
