import {
  AfterViewInit,
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
  input,
  OnDestroy,
  signal,
  ViewChild,
} from '@angular/core';
import { IssuePanelItemComponent } from './issue-panel-item/issue-panel-item.component';
import { MatIcon } from '@angular/material/icon';
import { MatFormField, MatLabel } from '@angular/material/form-field';
import { UiModule } from '../../../ui/ui.module';
import { CdkDrag, CdkDropList } from '@angular/cdk/drag-drop';
import { DropListService } from '../../../core-ui/drop-list/drop-list.service';
import { T } from 'src/app/t.const';
import { AsyncPipe } from '@angular/common';
import { IssueProvider } from '../../issue/issue.model';
import { getIssueProviderTooltip } from '../../issue/get-issue-provider-tooltip';
import { FormsModule } from '@angular/forms';
import { toObservable, toSignal } from '@angular/core/rxjs-interop';
import { IssueService } from '../../issue/issue.service';
import { debounceTime, filter, switchMap } from 'rxjs/operators';

@Component({
  selector: 'add-issues-panel',
  standalone: true,
  imports: [
    UiModule,
    IssuePanelItemComponent,
    MatIcon,
    MatFormField,
    MatLabel,
    CdkDropList,
    CdkDrag,
    AsyncPipe,
    FormsModule,
  ],
  templateUrl: './add-issues-panel.component.html',
  styleUrl: './add-issues-panel.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AddIssuesPanelComponent implements OnDestroy, AfterViewInit {
  dropListService = inject(DropListService);
  issueService = inject(IssueService);

  issueProvider = input.required<IssueProvider>();
  issueProviderTooltip = computed(() => getIssueProviderTooltip(this.issueProvider()));
  searchText = signal('s');

  // TODO add caching in sessionStorage
  issueItems$ = toObservable(this.searchText).pipe(
    filter((searchText) => searchText.length >= 1),
    debounceTime(300),
    switchMap((searchText) =>
      this.issueService.searchIssues$(
        searchText,
        // TODO remove migratedFromProjectId
        this.issueProvider().migratedFromProjectId || this.issueProvider().id,
      ),
    ),
  );
  issueItems = toSignal(this.issueItems$);

  @ViewChild(CdkDropList) dropList?: CdkDropList;

  T: typeof T = T;

  constructor() {
    this.issueItems$.subscribe((v) => console.log(`issueItems$`, v));
  }

  ngAfterViewInit(): void {
    this.dropListService.registerDropList(this.dropList!);
    console.log(this.dropList);
  }

  ngOnDestroy(): void {
    this.dropListService.unregisterDropList(this.dropList!);
  }
}
