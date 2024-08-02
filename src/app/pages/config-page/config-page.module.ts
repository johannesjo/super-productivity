import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ConfigPageComponent } from './config-page.component';
import { ConfigModule } from '../../features/config/config.module';
import { UiModule } from '../../ui/ui.module';
import { JiraViewComponentsModule } from '../../features/issue/providers/jira/jira-view-components/jira-view-components.module';
import { MatExpansionModule } from '@angular/material/expansion';
import { MatSliderModule } from '@angular/material/slider';
import { MatFormFieldModule } from '@angular/material/form-field';
import { FormsModule } from '@angular/forms';
import { MatInputModule } from '@angular/material/input';

@NgModule({
  imports: [
    CommonModule,
    ConfigModule,
    UiModule,
    JiraViewComponentsModule,
    MatExpansionModule,
    MatSliderModule,
    MatInputModule,
    MatFormFieldModule,
    FormsModule,
  ],
  declarations: [ConfigPageComponent],
})
export class ConfigPageModule {}
