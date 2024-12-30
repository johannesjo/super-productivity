import {
  BrowserModule,
  HAMMER_GESTURE_CONFIG,
  HammerModule,
} from '@angular/platform-browser';
import { ErrorHandler, inject, LOCALE_ID, NgModule } from '@angular/core';
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
import { ReactiveFormsModule } from '@angular/forms';
import { FormlyModule } from '@ngx-formly/core';
import { PagesModule } from './pages/pages.module';
import {
  HttpClient,
  provideHttpClient,
  withInterceptorsFromDi,
} from '@angular/common/http';
import { MatSidenavModule } from '@angular/material/sidenav';
import { TasksModule } from './features/tasks/tasks.module';
import { NoteModule } from './features/note/note.module';
import { ReminderModule } from './features/reminder/reminder.module';
import { GlobalErrorHandler } from './core/error-handler/global-error-handler.class';
import { MyHammerConfig } from '../hammer-config.class';
import { ProcrastinationModule } from './features/procrastination/procrastination.module';
import { TranslateLoader, TranslateModule } from '@ngx-translate/core';
import { TranslateHttpLoader } from '@ngx-translate/http-loader';
import { IS_ELECTRON, LanguageCode } from './app.constants';
import { LanguageService } from './core/language/language.service';
import { ProjectModule } from './features/project/project.module';
import { MaterialCssVarsModule } from 'angular-material-css-vars';
import { undoTaskDeleteMetaReducer } from './root-store/meta/undo-task-delete.meta-reducer';
import { actionLoggerReducer } from './root-store/meta/action-logger.reducer';
import { SyncModule } from './imex/sync/sync.module';
import { SearchBarModule } from './features/search-bar/search-bar.module';
import { TrackingReminderModule } from './features/tracking-reminder/tracking-reminder.module';
import { AndroidModule } from './features/android/android.module';
import { FocusModeModule } from './features/focus-mode/focus-mode.module';
import { ShepherdComponent } from './features/shepherd/shepherd.component';
import { CdkDropListGroup } from '@angular/cdk/drag-drop';
import { IssuePanelModule } from './features/issue-panel/issue-panel.module';
import { IS_ANDROID_WEB_VIEW } from './util/is-android-web-view';
import { BookmarkBarComponent } from './features/bookmark/bookmark-bar/bookmark-bar.component';
import { FeatureStoresModule } from './root-store/feature-stores.module';
import { BannerComponent } from './core/banner/banner/banner.component';
import { GlobalProgressBarComponent } from './core-ui/global-progress-bar/global-progress-bar.component';
import { MainHeaderComponent } from './core-ui/main-header/main-header.component';
import { SideNavComponent } from './core-ui/side-nav/side-nav.component';

// NOTE: export required for aot to work
export const createTranslateLoader = (http: HttpClient): TranslateHttpLoader =>
  new TranslateHttpLoader(http, './assets/i18n/', '.json');

@NgModule({
  declarations: [AppComponent, ShepherdComponent],
  bootstrap: [AppComponent],
  imports: [
    // Those features need to be included first for store not to mess up, probably because we use it initially at many places
    FeatureStoresModule,
    ProjectModule,
    // Other Local
    UiModule,
    PagesModule,
    MatSidenavModule,
    ProcrastinationModule,
    IssuePanelModule,
    TrackingReminderModule,
    ReminderModule,
    NoteModule,
    TasksModule,
    SyncModule,
    MaterialCssVarsModule.forRoot(),
    SearchBarModule,
    FocusModeModule,
    AndroidModule,
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
      enabled:
        !IS_ELECTRON &&
        !IS_ANDROID_WEB_VIEW &&
        (environment.production || environment.stage),
      // Register the ServiceWorker as soon as the application is stable
      // or after 30 seconds (whichever comes first).
      registrationStrategy: 'registerWhenStable:30000',
    }),
    TranslateModule.forRoot({
      loader: {
        provide: TranslateLoader,
        useFactory: createTranslateLoader,
        deps: [HttpClient],
      },
    }),
    CdkDropListGroup,
    BookmarkBarComponent,
    BannerComponent,
    GlobalProgressBarComponent,
    MainHeaderComponent,
    SideNavComponent,
  ],
  providers: [
    { provide: LOCALE_ID, useValue: navigator.language },
    { provide: ErrorHandler, useClass: GlobalErrorHandler },
    { provide: HAMMER_GESTURE_CONFIG, useClass: MyHammerConfig },
    provideHttpClient(withInterceptorsFromDi()),
  ],
})
export class AppModule {
  private _languageService = inject(LanguageService);

  constructor() {
    this._languageService.setDefault(LanguageCode.en);
    this._languageService.setFromBrowserLngIfAutoSwitchLng();
  }
}
