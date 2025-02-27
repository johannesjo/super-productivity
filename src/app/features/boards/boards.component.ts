import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { MatTab, MatTabContent, MatTabGroup, MatTabLabel } from '@angular/material/tabs';
import { Store } from '@ngrx/store';
import { T } from '../../t.const';
import { MatIcon } from '@angular/material/icon';
import { DEFAULT_BOARDS } from './boards.const';
import { BoardComponent } from './board/board.component';

@Component({
  selector: 'boards',
  standalone: true,
  imports: [MatTabGroup, MatTab, MatIcon, MatTabContent, MatTabLabel, BoardComponent],
  templateUrl: './boards.component.html',
  styleUrl: './boards.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class BoardsComponent {
  store = inject(Store);

  boards = signal(DEFAULT_BOARDS);
  protected readonly T = T;
}
