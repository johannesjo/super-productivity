import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ConfigPageComponent } from './config-page.component';
import { UiModule } from '../../ui/ui.module';
import { JiraViewComponentsModule } from '../../features/issue/providers/jira/jira-view-components/jira-view-components.module';
import { ConfigSectionComponent } from '../../features/config/config-section/config-section.component';
import { ConfigSoundFormComponent } from '../../features/config/config-sound-form/config-sound-form.component';

@NgModule({
  imports: [
    CommonModule,
    UiModule,
    JiraViewComponentsModule,
    ConfigSectionComponent,
    ConfigSoundFormComponent,
  ],
  declarations: [ConfigPageComponent],
})
export class ConfigPageModule {}
