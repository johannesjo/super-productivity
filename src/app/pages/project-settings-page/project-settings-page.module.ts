import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ProjectSettingsPageComponent } from './project-settings-page.component';
import { UiModule } from '../../ui/ui.module';
import { ConfigModule } from '../../features/config/config.module';
import { JiraViewComponentsModule } from '../../features/issue/providers/jira/jira-view-components/jira-view-components.module';

@NgModule({
  declarations: [ProjectSettingsPageComponent],
  imports: [CommonModule, ConfigModule, UiModule, JiraViewComponentsModule],
})
export class ProjectSettingsPageModule {}
