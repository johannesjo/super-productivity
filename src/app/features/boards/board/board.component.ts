/* eslint-disable @typescript-eslint/naming-convention */
import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';
import { BoardCfg, BoarFieldsToRemove } from '../boards.model';
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
  fieldsToRemove = computed<BoarFieldsToRemove>(() => {
    const tagIdsToRemove: string[] = [];
    this.boardCfg().panels.forEach((panel) => {
      if (panel.tagIds) {
        tagIdsToRemove.push(...panel.tagIds);
      }
    });
    return {
      tagIds: tagIdsToRemove,
    };
  });
}
