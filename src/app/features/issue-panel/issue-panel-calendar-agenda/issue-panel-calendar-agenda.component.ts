import {
  ChangeDetectionStrategy,
  Component,
  inject,
  input,
  OnInit,
  signal,
  viewChild,
} from '@angular/core';
import { ErrorCardComponent } from '../../../ui/error-card/error-card.component';
import { IssuePreviewItemComponent } from '../issue-preview-item/issue-preview-item.component';
import { MatProgressSpinner } from '@angular/material/progress-spinner';
import { DropListService } from '../../../core-ui/drop-list/drop-list.service';
import { IssueService } from '../../issue/issue.service';
import { IssueProvider, SearchResultItem } from '../../issue/issue.model';
import { CdkDropList } from '@angular/cdk/drag-drop';
import { T } from 'src/app/t.const';
import { ICalIssueReduced } from '../../issue/providers/calendar/calendar.model';
import { getErrorTxt } from 'src/app/util/get-error-text';
import { getWorklogStr } from '../../../util/get-work-log-str';
import { DatePipe } from '@angular/common';
import { standardListAnimation } from '../../../ui/animations/standard-list.ani';

@Component({
  selector: 'issue-panel-calendar-agenda',
  imports: [ErrorCardComponent, IssuePreviewItemComponent, MatProgressSpinner, DatePipe],
  templateUrl: './issue-panel-calendar-agenda.component.html',
  styleUrl: './issue-panel-calendar-agenda.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
  animations: [standardListAnimation],
})
export class IssuePanelCalendarAgendaComponent implements OnInit {
  readonly T: typeof T = T;

  dropListService = inject(DropListService);
  private _issueService = inject(IssueService);

  issueProvider = input.required<IssueProvider>();
  error = signal<string | undefined>(undefined);
  isLoading = signal(false);

  readonly dropList = viewChild(CdkDropList);

  agendaItems = signal<
    {
      dayStr: string;
      itemsForDay: SearchResultItem<'ICAL'>[];
    }[]
  >([]);

  ngOnInit(): void {
    this._loadAgendaItems();
  }

  addIssue(item: SearchResultItem): void {
    const ip = this.issueProvider();

    if (item.issueType !== ip.issueProviderKey) {
      throw new Error('Issue Provider and Search Result Type dont match');
    }

    console.log('Add issue', item);

    this._issueService.addTaskFromIssue({
      issueDataReduced: item.issueData,
      issueProviderId: ip.id,
      issueProviderKey: ip.issueProviderKey,
    });
  }

  private _loadAgendaItems(): void {
    // this._setAgendaItems([
    //   {
    //     issueType: 'ICAL',
    //     title: 'some title',
    //     titleHighlighted: 'some title',
    //     issueData: {
    //       id: '1',
    //       calProviderId: 'xxx',
    //       title: 'some title',
    //       description: 'description alalala',
    //       start: Date.now(),
    //       duration: 60 * 60 * 1000,
    //     },
    //   },
    //   {
    //     issueType: 'ICAL',
    //     title: 'some title',
    //     titleHighlighted: 'some title',
    //     issueData: {
    //       id: '1',
    //       calProviderId: 'xxx',
    //       title: 'some title',
    //       description: 'description alalala',
    //       // eslint-disable-next-line no-mixed-operators
    //       start: Date.now() + 48 * 60 * 60 * 1000,
    //       duration: 60 * 60 * 1000,
    //     },
    //   },
    // ]);
    this.isLoading.set(true);
    this._issueService
      .searchIssues$(
        '',
        this.issueProvider().id,
        this.issueProvider().issueProviderKey,
        true,
      )
      .subscribe(
        (items: SearchResultItem[]) => {
          this.isLoading.set(false);
          this._setAgendaItems(items as SearchResultItem<'ICAL'>[]);
        },
        (e) => {
          this.isLoading.set(false);
          this._setAgendaItems([]);
          console.error(e);
          this.error.set(getErrorTxt(e));
        },
      );
  }

  private _setAgendaItems(items: SearchResultItem<'ICAL'>[]): void {
    const agenda = items.reduce(
      (acc, item) => {
        const date = getWorklogStr((item.issueData as ICalIssueReduced).start);

        const existingDay = acc.find((day) => day.dayStr === date);
        if (existingDay) {
          existingDay.itemsForDay.push(item);
        } else {
          acc.push({
            dayStr: date,
            itemsForDay: [item],
          });
        }
        return acc;
      },
      [] as { dayStr: string; itemsForDay: SearchResultItem<'ICAL'>[] }[],
    );

    // sort by start time
    agenda.forEach((day) => {
      day.itemsForDay.sort((a, b) => (a.issueData.start > b.issueData.start ? 1 : -1));
    });

    this.agendaItems.set(agenda.sort((a, b) => (a.dayStr > b.dayStr ? 1 : -1)));
  }
}
