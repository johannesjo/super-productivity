import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ConfigPageComponent } from './config-page.component';
import { ConfigModule } from '../../core/config/config.module';
import { UiModule } from '../../ui/ui.module';
import { CoreModule } from '../../core/core.module';

@NgModule({
  imports: [
    CommonModule,
    CoreModule,
    ConfigModule,
    UiModule,
  ],
  declarations: [ConfigPageComponent]
})
export class ConfigPageModule {
}
