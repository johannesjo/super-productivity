import {
  AfterViewInit,
  ChangeDetectionStrategy,
  Component,
  computed,
  ElementRef,
  inject,
  input,
  OnDestroy,
  signal,
  ViewChild,
} from '@angular/core';
import { IssuePreviewItemComponent } from './issue-preview-item/issue-preview-item.component';
import { MatIcon } from '@angular/material/icon';
import { MatFormField, MatLabel } from '@angular/material/form-field';
import { UiModule } from '../../../ui/ui.module';
import { CdkDrag, CdkDropList } from '@angular/cdk/drag-drop';
import { DropListService } from '../../../core-ui/drop-list/drop-list.service';
import { T } from 'src/app/t.const';
import { AsyncPipe } from '@angular/common';
import { IssueProvider, SearchResultItem } from '../../issue/issue.model';
import { getIssueProviderTooltip } from '../../issue/get-issue-provider-tooltip';
import { FormsModule } from '@angular/forms';
import { toObservable, toSignal } from '@angular/core/rxjs-interop';
import { IssueService } from '../../issue/issue.service';
import { catchError, debounceTime, filter, map, switchMap, tap } from 'rxjs/operators';
import { Store } from '@ngrx/store';
import { Observable, of } from 'rxjs';
import { selectAllTaskIssueIdsForIssueProvider } from '../../tasks/store/task.selectors';
import { DialogEditIssueProviderComponent } from '../../issue/dialog-edit-issue-provider/dialog-edit-issue-provider.component';
import { MatDialog } from '@angular/material/dialog';
import { getErrorTxt } from '../../../util/get-error-text';
import { ErrorCardComponent } from '../../../ui/error-card/error-card.component';

@Component({
  selector: 'issue-provider-tab',
  standalone: true,
  imports: [
    UiModule,
    IssuePreviewItemComponent,
    MatIcon,
    MatFormField,
    MatLabel,
    CdkDropList,
    CdkDrag,
    AsyncPipe,
    FormsModule,
    ErrorCardComponent,
  ],
  templateUrl: './issue-provider-tab.component.html',
  styleUrl: './issue-provider-tab.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class IssueProviderTabComponent implements OnDestroy, AfterViewInit {
  dropListService = inject(DropListService);
  private _issueService = inject(IssueService);
  private _matDialog = inject(MatDialog);
  private _store = inject(Store);

  issueProvider = input.required<IssueProvider>();
  issueProviderTooltip = computed(() => getIssueProviderTooltip(this.issueProvider()));
  searchText = signal('s');
  error = signal<string | undefined>(undefined);
  isLoading = signal(false);

  // TODO add caching in sessionStorage
  issueItems$: Observable<{ added: SearchResultItem[]; notAdded: SearchResultItem[] }> =
    toObservable(this.searchText).pipe(
      filter((searchText) => searchText.length >= 1),
      debounceTime(300),
      tap(() => this.isLoading.set(true)),
      switchMap((searchText) =>
        this._issueService.searchIssues$(searchText, this.issueProvider().id).pipe(
          catchError((e) => {
            this.error.set(getErrorTxt(e));
            this.isLoading.set(false);
            return of(true);
          }),
          map((trueOnErrorOrItems) => {
            if (trueOnErrorOrItems === true) {
              return [];
            }
            this.error.set(undefined);
            return trueOnErrorOrItems as SearchResultItem[];
          }),
        ),
      ),
      switchMap((items) =>
        this._store
          .select(selectAllTaskIssueIdsForIssueProvider(this.issueProvider()))
          .pipe(
            map((allIssueIdsForProvider) => {
              const added: SearchResultItem[] = [];
              const notAdded: SearchResultItem[] = [];
              items.forEach((item) => {
                if (allIssueIdsForProvider.includes(item.issueData.id.toString())) {
                  added.push(item);
                } else {
                  notAdded.push(item);
                }
              });
              return { added, notAdded };
            }),
          ),
      ),

      tap(() => this.isLoading.set(false)),
    );

  issueItems = toSignal(this.issueItems$.pipe(map((v) => v.notAdded)));

  @ViewChild(CdkDropList) dropList?: CdkDropList;
  @ViewChild('searchTextEl') searchTextEl!: ElementRef;

  T: typeof T = T;

  private _focusTimeout?: number;

  ngAfterViewInit(): void {
    this.dropListService.registerDropList(this.dropList!);

    if (this.searchText().length <= 1) {
      this._focusTimeout = window.setTimeout(() => {
        this.searchTextEl?.nativeElement.focus();
      }, 500);
    }
  }

  ngOnDestroy(): void {
    this.dropListService.unregisterDropList(this.dropList!);
    window.clearTimeout(this._focusTimeout);
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

  openSettings(): void {
    this._matDialog.open(DialogEditIssueProviderComponent, {
      restoreFocus: true,
      data: {
        issueProvider: this.issueProvider(),
      },
    });
  }
}
