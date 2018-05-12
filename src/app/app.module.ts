import { BrowserModule } from '@angular/platform-browser';
import { NgModule } from '@angular/core';
import { AppComponent } from './app.component';
import { UpgradeModule } from '@angular/upgrade/static';
import { APPNAME } from './app.module.ajs';


@NgModule({
  declarations: [
    AppComponent
  ],
  imports: [
    BrowserModule,
    UpgradeModule
  ],
  providers: [],
  bootstrap: [AppComponent]
})
export class AppModule {
  constructor(private upgradeModule: UpgradeModule) {
  }

  ngDoBootstrap() {
    this.upgradeModule.bootstrap(document.documentElement, [APPNAME], {strictDi: true});
  }
}
