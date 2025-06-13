import {
  AfterViewInit,
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  effect,
  inject,
  OnDestroy,
  signal,
  viewChild,
  viewChildren,
} from '@angular/core';
import { MatTab, MatTabContent, MatTabGroup, MatTabLabel } from '@angular/material/tabs';
import { Store } from '@ngrx/store';
import { T } from '../../t.const';
import { MatIcon } from '@angular/material/icon';
import { MatMenuModule, MatMenuTrigger } from '@angular/material/menu';
import { nanoid } from 'nanoid';
import { BoardComponent } from './board/board.component';
import { CdkScrollable } from '@angular/cdk/overlay';
import { CdkDropListGroup } from '@angular/cdk/drag-drop';
import { toSignal } from '@angular/core/rxjs-interop';
import { selectAllBoards } from './store/boards.selectors';
import { LS } from '../../core/persistence/storage-keys.const';
import { TranslatePipe } from '@ngx-translate/core';
import { BoardEditComponent } from './board-edit/board-edit.component';
import { DEFAULT_BOARD_CFG } from './boards.const';
import { BoardsActions } from './store/boards.actions';

@Component({
  selector: 'boards',
  standalone: true,
  imports: [
    MatMenuModule,
    MatTabGroup,
    MatTab,
    MatIcon,
    MatTabContent,
    MatTabLabel,
    BoardComponent,
    CdkScrollable,
    CdkDropListGroup,
    TranslatePipe,
    BoardEditComponent,
  ],
  templateUrl: './boards.component.html',
  styleUrl: './boards.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class BoardsComponent implements AfterViewInit, OnDestroy {
  readonly contextMenuTrigger = viewChild.required<MatMenuTrigger>('menuTrigger');
  readonly contextMenuTriggers = viewChildren<MatMenuTrigger>('menuTrigger');
  store = inject(Store);
  selectedTabIndex = signal(localStorage.getItem(LS.SELECTED_BOARD) || 0);

  boards = toSignal(this.store.select(selectAllBoards));
  protected readonly T = T;

  DEFAULT_BOARD_CFG = DEFAULT_BOARD_CFG;

  constructor(private elementRef: ElementRef) {
    effect(() => {
      localStorage.setItem(LS.SELECTED_BOARD, this.selectedTabIndex().toString());
    });
  }
  ngAfterViewInit(): void {
    const boardTabEls = this.elementRef.nativeElement.querySelectorAll(
      'mat-tab-header [id*="mat-tab-group"]',
    );
    boardTabEls.forEach((element: HTMLElement) => {
      element.addEventListener('click', this.tabClick.bind(this));
    });
  }

  ngOnDestroy(): void {
    const boardTabEls = this.elementRef.nativeElement.querySelectorAll(
      'mat-tab-header [id*="mat-tab-group"]',
    );
    boardTabEls.forEach((element: HTMLElement) => {
      element.removeEventListener('click', this.tabClick.bind(this));
    });
  }

  goToLastIndex(): void {
    // NOTE: since the index number does not change (the add tab index is at the same index as the newly added tab) we need to do this in two steps
    const newIndex = (this.boards()?.length || 1) - 1;
    setTimeout(() => {
      this.selectedTabIndex.set(newIndex);
    });
  }

  // Tab change happens before the click event gets to the callback.
  // We need to delay updating the selected tab index until the click event has completed
  // propagation.
  onTabChange(index: number): void {
    setTimeout(() => this.selectedTabIndex.set(index));
  }

  tabClick(event: MouseEvent): void {
    const activeTabIdx = this.selectedTabIndex();
    // Get the element where the click event is attached, not the actual element
    // that receives the click
    const el = event.currentTarget as HTMLElement;
    const clickedTabIdx = el.id.substring(el.id.length - 1);
    if (parseInt(clickedTabIdx) == activeTabIdx) {
      // Open context menu
      this.contextMenuTriggers()[activeTabIdx].openMenu();
    }
  }

  duplicateBoard(): void {
    const selectedTabId = this.selectedTabIndex();
    const boardToDuplicate = this.boards()?.[selectedTabId];
    if (!boardToDuplicate) {
      console.warn('No board selected to duplicate');
      return;
    }
    this.store.dispatch(
      BoardsActions.addBoard({
        board: {
          cols: boardToDuplicate.cols,
          id: nanoid(),
          panels: boardToDuplicate.panels.map((panel) => ({
            ...panel,
            taskIds: [],
          })),
          title: `${boardToDuplicate.title} (copy)`,
        },
      }),
    );
  }
}
