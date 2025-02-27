/* eslint-disable @typescript-eslint/naming-convention */
import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { BoardCfg } from '../boards.model';
import { BoardTaskListComponent } from '../board-task-list/board-task-list.component';
import { MatIconButton } from '@angular/material/button';
import { MatIcon } from '@angular/material/icon';

@Component({
  selector: 'board',
  standalone: true,
  imports: [BoardTaskListComponent, MatIconButton, MatIcon],
  templateUrl: './board.component.html',
  styleUrl: './board.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {
    '[style.--cols]': 'boardCfg().cols',
    '[style.--rows]': 'boardCfg().rows',
  },
})
export class BoardComponent {
  boardCfg = input.required<BoardCfg>();
}
