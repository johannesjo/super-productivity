import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ConfigPageComponent } from './config-page.component';
import { ConfigModule } from '../../features/config/config.module';
import { UiModule } from '../../ui/ui.module';
import { GoogleModule } from '../../features/google/google.module';
import { JiraViewComponentsModule } from '../../features/issue/providers/jira/jira-view-components/jira-view-components.module';
import { DropboxModule } from '../../features/dropbox/dropbox.module';

@NgModule({
  imports: [
    CommonModule,
    ConfigModule,
    UiModule,
    GoogleModule,
    DropboxModule,
    JiraViewComponentsModule,
  ],
  declarations: [ConfigPageComponent]
})
export class ConfigPageModule {
}
