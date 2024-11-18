import { ChangeDetectionStrategy, Component } from '@angular/core';
import { IssuePanelItemComponent } from './issue-panel-item/issue-panel-item.component';
import { MatIcon } from '@angular/material/icon';
import { MatFormField, MatLabel } from '@angular/material/form-field';
import { UiModule } from '../../../ui/ui.module';

@Component({
  selector: 'add-issues-panel',
  standalone: true,
  imports: [UiModule, IssuePanelItemComponent, MatIcon, MatFormField, MatLabel],
  templateUrl: './add-issues-panel.component.html',
  styleUrl: './add-issues-panel.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AddIssuesPanelComponent {
  protected readonly Array = Array;
}
