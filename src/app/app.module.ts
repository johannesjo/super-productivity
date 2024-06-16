import {
  BrowserModule,
  HAMMER_GESTURE_CONFIG,
  HammerModule,
} from '@angular/platform-browser';
import { ErrorHandler, NgModule } from '@angular/core';
import { AppComponent } from './app.component';
import { ServiceWorkerModule } from '@angular/service-worker';
import { environment } from '../environments/environment';
import { StoreModule } from '@ngrx/store';
import { EffectsModule } from '@ngrx/effects';
import { StoreDevtoolsModule } from '@ngrx/store-devtools';
import { BrowserAnimationsModule } from '@angular/platform-browser/animations';
import { RouterModule } from '@angular/router';
import { APP_ROUTES } from './app.routes';
import { UiModule } from './ui/ui.module';
import { reducers } from './root-store';
import { CoreModule } from './core/core.module';
import { ReactiveFormsModule } from '@angular/forms';
import { FormlyModule } from '@ngx-formly/core';
import { PagesModule } from './pages/pages.module';
import { MainHeaderModule } from './core-ui/main-header/main-header.module';
import {
  HttpClient,
  provideHttpClient,
  withInterceptorsFromDi,
} from '@angular/common/http';
import { MatSidenavModule } from '@angular/material/sidenav';
import { TasksModule } from './features/tasks/tasks.module';
import { BookmarkModule } from './features/bookmark/bookmark.module';
import { NoteModule } from './features/note/note.module';
import { ReminderModule } from './features/reminder/reminder.module';
import { CoreUiModule } from './core-ui/core-ui.module';
import { GlobalErrorHandler } from './core/error-handler/global-error-handler.class';
import { MyHammerConfig } from '../hammer-config.class';
import { ProcrastinationModule } from './features/procrastination/procrastination.module';
import { TranslateLoader, TranslateModule } from '@ngx-translate/core';
import { TranslateHttpLoader } from '@ngx-translate/http-loader';
import { IS_ELECTRON, LanguageCode } from './app.constants';
import { LanguageService } from './core/language/language.service';
import { ConfigModule } from './features/config/config.module';
import { ProjectModule } from './features/project/project.module';
import { EntityDataModule } from '@ngrx/data';
import { MaterialCssVarsModule } from 'angular-material-css-vars';
import { WorkContextModule } from './features/work-context/work-context.module';
import { undoTaskDeleteMetaReducer } from './root-store/meta/undo-task-delete.meta-reducer';
import { actionLoggerReducer } from './root-store/meta/action-logger.reducer';
import { SyncModule } from './imex/sync/sync.module';
import { SearchBarModule } from './features/search-bar/search-bar.module';
import { IdleModule } from './features/idle/idle.module';
import { TrackingReminderModule } from './features/tracking-reminder/tracking-reminder.module';
import { FinishDayBeforeCloseModule } from './features/finish-day-before-close/finish-day-before-close.module';
import { AndroidModule } from './features/android/android.module';
import { DominaModeModule } from './features/domina-mode/domina-mode.module';
import { FocusModeModule } from './features/focus-mode/focus-mode.module';
import { CalendarIntegrationModule } from './features/calendar-integration/calendar-integration.module';
import { ShepherdComponent } from './features/shepherd/shepherd.component';

// NOTE: export required for aot to work
export const createTranslateLoader = (http: HttpClient): TranslateHttpLoader =>
  new TranslateHttpLoader(http, './assets/i18n/', '.json');

@NgModule({
  declarations: [AppComponent, ShepherdComponent],
  bootstrap: [AppComponent],
  imports: [
    // Those features need to be included first for store not to mess up, probably because we use it initially at many places
    ConfigModule,
    ProjectModule,
    WorkContextModule,
    // Local
    CoreModule,
    UiModule,
    CoreUiModule,
    PagesModule,
    MainHeaderModule,
    MatSidenavModule,
    ProcrastinationModule,
    IdleModule,
    TrackingReminderModule,
    ReminderModule,
    CoreUiModule,
    NoteModule,
    BookmarkModule,
    TasksModule,
    SyncModule,
    MaterialCssVarsModule.forRoot(),
    SearchBarModule,
    FinishDayBeforeCloseModule,
    DominaModeModule,
    FocusModeModule,
    CalendarIntegrationModule,
    AndroidModule,
    // throws build error ...(IS_ANDROID_WEB_VIEW ? [AndroidModule] : []),
    // External
    BrowserModule,
    BrowserAnimationsModule,
    HammerModule,
    RouterModule.forRoot(APP_ROUTES, { useHash: true }),
    // NOTE: both need to be present to use forFeature stores
    StoreModule.forRoot(reducers, {
      metaReducers: [undoTaskDeleteMetaReducer, actionLoggerReducer],
      ...(environment.production
        ? {
            runtimeChecks: {
              strictStateImmutability: false,
              strictActionImmutability: false,
              strictStateSerializability: false,
              strictActionSerializability: false,
            },
          }
        : {
            runtimeChecks: {
              strictStateImmutability: true,
              strictActionImmutability: true,
              strictStateSerializability: true,
              strictActionSerializability: true,
            },
          }),
    }),
    EffectsModule.forRoot([]),
    !environment.production && !environment.stage
      ? StoreDevtoolsModule.instrument({ connectInZone: true })
      : [],
    ReactiveFormsModule,
    FormlyModule.forRoot({
      extras: {
        immutable: true,
      },
      validationMessages: [{ name: 'pattern', message: 'Invalid input' }],
    }),
    ServiceWorkerModule.register('ngsw-worker.js', {
      enabled: !IS_ELECTRON && (environment.production || environment.stage),
    }),
    TranslateModule.forRoot({
      loader: {
        provide: TranslateLoader,
        useFactory: createTranslateLoader,
        deps: [HttpClient],
      },
    }),
    EntityDataModule,
  ],
  providers: [
    { provide: ErrorHandler, useClass: GlobalErrorHandler },
    { provide: HAMMER_GESTURE_CONFIG, useClass: MyHammerConfig },
    provideHttpClient(withInterceptorsFromDi()),
  ],
})
export class AppModule {
  constructor(private _languageService: LanguageService) {
    this._languageService.setDefault(LanguageCode.en);
    this._languageService.setFromBrowserLngIfAutoSwitchLng();
  }
}
