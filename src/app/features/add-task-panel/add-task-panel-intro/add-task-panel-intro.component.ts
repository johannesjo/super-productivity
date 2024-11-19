import { ChangeDetectionStrategy, Component } from '@angular/core';
import {
  MatCard,
  MatCardActions,
  MatCardContent,
  MatCardHeader,
} from '@angular/material/card';
import { MatButton } from '@angular/material/button';
import { UiModule } from '../../../ui/ui.module';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'add-task-panel-intro',
  standalone: true,
  imports: [
    CommonModule,
    UiModule,
    MatCard,
    MatCardHeader,
    MatCardContent,
    MatCardActions,
    MatButton,
  ],
  templateUrl: './add-task-panel-intro.component.html',
  styleUrl: './add-task-panel-intro.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AddTaskPanelIntroComponent {}
