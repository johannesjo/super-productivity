import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ConfigPageComponent } from './config-page.component';
import { ConfigModule } from '../../features/config/config.module';
import { UiModule } from '../../ui/ui.module';
import { JiraViewComponentsModule } from '../../features/issue/providers/jira/jira-view-components/jira-view-components.module';

@NgModule({
  imports: [CommonModule, ConfigModule, UiModule, JiraViewComponentsModule],
  declarations: [ConfigPageComponent],
})
export class ConfigPageModule {}
