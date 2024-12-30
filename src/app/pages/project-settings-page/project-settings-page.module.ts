import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ProjectSettingsPageComponent } from './project-settings-page.component';
import { UiModule } from '../../ui/ui.module';
import { JiraViewComponentsModule } from '../../features/issue/providers/jira/jira-view-components/jira-view-components.module';
import { ConfigSectionComponent } from '../../features/config/config-section/config-section.component';

@NgModule({
  declarations: [ProjectSettingsPageComponent],
  imports: [CommonModule, UiModule, JiraViewComponentsModule, ConfigSectionComponent],
})
export class ProjectSettingsPageModule {}
