import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ConfigPageComponent } from './config-page.component';
import { ConfigModule } from '../../core/config/config.module';
import { UiModule } from '../../ui/ui.module';
import { CoreModule } from '../../core/core.module';
import { BackupSettingsComponent } from './old-cfg-components/backup-settings/backup-settings.component';
import { GitSettingsComponent } from './old-cfg-components/git-settings/git-settings.component';
import { JiraSettingsComponent } from './old-cfg-components/jira-settings/jira-settings.component';
import { KeyboardSettingsComponent } from './old-cfg-components/keyboard-settings/keyboard-settings.component';
import { MiscSettingsComponent } from './old-cfg-components/misc-settings/misc-settings.component';
import { PomodoroSettingsComponent } from './old-cfg-components/pomodoro-settings/pomodoro-settings.component';
import { ThemeSettingsComponent } from './old-cfg-components/theme-settings/theme-settings.component';

@NgModule({
  imports: [
    CommonModule,
    CoreModule,
    ConfigModule,
    UiModule,
  ],
  declarations: [ConfigPageComponent, BackupSettingsComponent, GitSettingsComponent, JiraSettingsComponent, KeyboardSettingsComponent, MiscSettingsComponent, PomodoroSettingsComponent, ThemeSettingsComponent]
})
export class ConfigPageModule {
}
