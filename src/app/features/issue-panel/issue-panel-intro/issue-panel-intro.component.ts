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
  selector: 'issue-panel-intro',
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
  templateUrl: './issue-panel-intro.component.html',
  styleUrl: './issue-panel-intro.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class IssuePanelIntroComponent {}
