import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ConfigPageComponent } from './config-page.component';
import { ConfigModule } from '../../core/config/config.module';
import { UiModule } from '../../ui/ui.module';
import { CoreModule } from '../../core/core.module';
import { GoogleModule } from '../../core/google/google.module';

@NgModule({
  imports: [
    CommonModule,
    CoreModule,
    ConfigModule,
    UiModule,
    GoogleModule,
  ],
  declarations: [ConfigPageComponent]
})
export class ConfigPageModule {
}
