import {NgModule} from '@angular/core';
import {CommonModule} from '@angular/common';
import {ProjectSettingsComponent} from './project-settings.component';
import {UiModule} from '../../ui/ui.module';
import {ConfigModule} from '../../features/config/config.module';
import {GoogleModule} from '../../features/google/google.module';
import {JiraModule} from '../../features/issue/jira/jira.module';


@NgModule({
  declarations: [ProjectSettingsComponent],
  imports: [
    CommonModule,
    ConfigModule,
    UiModule,
    JiraModule,
  ]
})
export class ProjectSettingsModule {
}
