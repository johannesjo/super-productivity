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
import { WorkViewModule } from './pages/work-view/work-view.module';
import { UiModule } from './ui/ui.module';
import { reducers } from './root-store';
import { CoreModule } from './core/core.module';

@NgModule({
  declarations: [
    AppComponent,
  ],
  imports: [
    CoreModule,
    BrowserModule,
    BrowserAnimationsModule,
    RouterModule.forRoot(APP_ROUTES, {useHash: true}),
    ServiceWorkerModule.register('ngsw-worker.js', {enabled: environment.production}),
    // NOTE: both need to be present to use forFeature stores
    StoreModule.forRoot(reducers),
    EffectsModule.forRoot([]),
    !environment.production ? StoreDevtoolsModule.instrument() : [],

    // Other local
    UiModule,

    // Pages
    WorkViewModule,
  ],
  providers: [],
  bootstrap: [AppComponent]
})
export class AppModule {
}
