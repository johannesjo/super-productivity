import { ChangeDetectionStrategy, Component, inject, Signal } from '@angular/core';
import { T } from '../../../t.const';
import { MatIcon } from '@angular/material/icon';
import { TranslateModule } from '@ngx-translate/core';
import { IssueProvider, IssueProviderKey } from '../../issue/issue.model';
import { DialogEditIssueProviderComponent } from '../../issue/dialog-edit-issue-provider/dialog-edit-issue-provider.component';
import { Store } from '@ngrx/store';
import { MatDialog } from '@angular/material/dialog';
import { UiModule } from '../../../ui/ui.module';
import { CalendarContextInfoTarget } from '../../issue/providers/calendar/calendar.model';
import { selectEnabledIssueProviders } from '../../issue/store/issue-provider.selectors';
import { IssueModule } from '../../issue/issue.module';
import {
  getIssueProviderInitials,
  getIssueProviderTooltip,
} from '../../issue/mapping-helper/get-issue-provider-tooltip';
import { toSignal } from '@angular/core/rxjs-interop';
import { map } from 'rxjs/operators';

@Component({
  selector: 'issue-provider-setup-overview',
  standalone: true,
  imports: [UiModule, MatIcon, TranslateModule, IssueModule],
  templateUrl: './issue-provider-setup-overview.component.html',
  styleUrl: './issue-provider-setup-overview.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class IssueProviderSetupOverviewComponent {
  protected readonly T = T;
  private _store = inject(Store);
  private _matDialog = inject(MatDialog);

  enabledProviders$ = this._store.select(selectEnabledIssueProviders);

  issueProvidersMapped: Signal<
    {
      issueProvider: IssueProvider;
      initials?: string | null;
      tooltip: string;
    }[]
  > = toSignal(
    this.enabledProviders$.pipe(
      map((issueProviders) =>
        issueProviders.map((p) => ({
          issueProvider: p,
          initials: getIssueProviderInitials(p),
          tooltip: getIssueProviderTooltip(p),
        })),
      ),
    ),
    { initialValue: [] },
  );

  openSetupDialog(
    issueProviderKey: IssueProviderKey,
    calendarContextInfoTarget?: CalendarContextInfoTarget,
  ): void {
    this._matDialog.open(DialogEditIssueProviderComponent, {
      restoreFocus: true,
      data: {
        issueProviderKey,
        calendarContextInfoTarget,
      },
    });
  }
}
