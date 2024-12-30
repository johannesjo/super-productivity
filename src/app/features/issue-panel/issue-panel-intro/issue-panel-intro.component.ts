import { ChangeDetectionStrategy, Component } from '@angular/core';
import {
  MatCard,
  MatCardActions,
  MatCardContent,
  MatCardHeader,
  MatCardTitle,
} from '@angular/material/card';
import { MatButton } from '@angular/material/button';

@Component({
  selector: 'issue-panel-intro',
  imports: [
    MatCard,
    MatCardHeader,
    MatCardContent,
    MatCardActions,
    MatCardTitle,
    MatButton,
  ],
  templateUrl: './issue-panel-intro.component.html',
  styleUrl: './issue-panel-intro.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class IssuePanelIntroComponent {}
