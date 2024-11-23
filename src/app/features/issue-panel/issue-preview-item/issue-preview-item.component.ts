import {
  ChangeDetectionStrategy,
  Component,
  computed,
  input,
  output,
} from '@angular/core';
import { MatIconButton } from '@angular/material/button';
import { MatIcon } from '@angular/material/icon';
import { SearchResultItem } from '../../issue/issue.model';
import { isIssueDone } from '../../issue/mapping-helper/is-issue-done';

@Component({
  selector: 'issue-preview-item',
  standalone: true,
  imports: [MatIconButton, MatIcon],
  templateUrl: './issue-preview-item.component.html',
  styleUrl: './issue-preview-item.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
  /* eslint-disable @typescript-eslint/naming-convention*/
  host: {
    '[class.isDone]': 'isIssueDone()',
  },
})
export class IssuePreviewItemComponent {
  itemData = input.required<SearchResultItem>();
  addIssue = output<SearchResultItem>();
  isIssueDone = computed(() => {
    return isIssueDone(this.itemData());
  });
}
