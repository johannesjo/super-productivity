import {
  ChangeDetectionStrategy,
  Component,
  effect,
  inject,
  signal,
} from '@angular/core';
import { MatTab, MatTabContent, MatTabGroup, MatTabLabel } from '@angular/material/tabs';
import { Store } from '@ngrx/store';
import { T } from '../../t.const';
import { MatIcon } from '@angular/material/icon';
import { BoardComponent } from './board/board.component';
import { CdkScrollable } from '@angular/cdk/overlay';
import { CdkDropListGroup } from '@angular/cdk/drag-drop';
import { toSignal } from '@angular/core/rxjs-interop';
import { selectAllBoards } from './store/boards.selectors';
import { LS } from '../../core/persistence/storage-keys.const';
import { TranslatePipe } from '@ngx-translate/core';
import { BoardEditComponent } from './board-edit/board-edit.component';
import { DEFAULT_BOARD_CFG } from './boards.const';

@Component({
  selector: 'boards',
  standalone: true,
  imports: [
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
export class BoardsComponent {
  store = inject(Store);
  selectedTabIndex = signal(localStorage.getItem(LS.SELECTED_BOARD) || 0);

  boards = toSignal(this.store.select(selectAllBoards));
  protected readonly T = T;

  DEFAULT_BOARD_CFG = DEFAULT_BOARD_CFG;

  constructor() {
    effect(() => {
      localStorage.setItem(LS.SELECTED_BOARD, this.selectedTabIndex().toString());
    });
  }

  goToLastIndex(): void {
    // NOTE: since the index number does not change (the add tab index is at the same index as the newly added tab) we need to do this in two steps
    const newIndex = (this.boards()?.length || 1) - 1;
    this.selectedTabIndex.set(newIndex + 1);
    setTimeout(() => {
      this.selectedTabIndex.set(newIndex);
    });
  }
}
