import {
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
  input,
  output,
} from '@angular/core';
import { MatIconButton } from '@angular/material/button';
import { MatIcon } from '@angular/material/icon';
import { SearchResultItem } from '../../issue/issue.model';
import { isIssueDone } from '../../issue/mapping-helper/is-issue-done';
import { IssueService } from '../../issue/issue.service';
import { first } from 'rxjs/operators';

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
  private _issueService = inject(IssueService);

  isNoLink = input<boolean>(false);
  issueProviderId = input.required<string>();
  itemData = input.required<SearchResultItem>();
  addIssue = output<SearchResultItem>();
  isIssueDone = computed(() => {
    return isIssueDone(this.itemData());
  });

  async openIssue(): Promise<void> {
    const url = await this._issueService
      .issueLink$(
        this.itemData().issueType,
        this.itemData().issueData.id,
        this.issueProviderId(),
      )
      .pipe(first())
      .toPromise();
    window.open(url, '_blank');
  }
}
