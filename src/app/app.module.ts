import { BrowserModule } from '@angular/platform-browser';
import { NgModule } from '@angular/core';
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
import { FormlyMaterialModule } from '@ngx-formly/material';
import { PagesModule } from './pages/pages.module';
import { MainHeaderModule } from './main-header/main-header.module';
import { HttpClientModule } from '@angular/common/http';
import { MatSidenavModule } from '@angular/material';
import { TasksModule } from './tasks/tasks.module';
import { TimeTrackingModule } from './time-tracking/time-tracking.module';
import { BookmarkModule } from './bookmark/bookmark.module';
import { NoteModule } from './note/note.module';
import { ReminderModule } from './reminder/reminder.module';

@NgModule({
  declarations: [
    AppComponent,
  ],
  imports: [
    // Local
    UiModule,
    CoreModule,
    PagesModule,
    MainHeaderModule,
    BookmarkModule,
    MatSidenavModule,
    TasksModule,
    TimeTrackingModule,
    NoteModule,
    ReminderModule,

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
    FormlyModule.forRoot(),
    FormlyMaterialModule,
    ServiceWorkerModule.register('ngsw-worker.js', {enabled: environment.production}),
    NoteModule,
  ],
  providers: [],
  bootstrap: [AppComponent]
})
export class AppModule {
}
