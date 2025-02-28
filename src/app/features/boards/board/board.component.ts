/* eslint-disable @typescript-eslint/naming-convention */
import {
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
  input,
} from '@angular/core';
import { BoardCfg } from '../boards.model';
import { BoardTaskListComponent } from '../board-task-list/board-task-list.component';
import { MatButton, MatIconButton } from '@angular/material/button';
import { MatIcon } from '@angular/material/icon';
import { toSignal } from '@angular/core/rxjs-interop';
import { Store } from '@ngrx/store';
import { selectAllTagIds } from '../../tag/store/tag.reducer';
import { unique } from '../../../util/unique';
import { addTag } from '../../tag/store/tag.actions';
import { DEFAULT_TAG, IMPORTANT_TAG, URGENT_TAG } from '../../tag/tag.const';

@Component({
  selector: 'board',
  standalone: true,
  imports: [BoardTaskListComponent, MatIconButton, MatIcon, MatButton],
  templateUrl: './board.component.html',
  styleUrl: './board.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {
    '[style.--cols]': 'missingTagIds().length === 0 && boardCfg().cols',
    '[style.--rows]': 'missingTagIds().length === 0 && boardCfg().rows',
  },
})
export class BoardComponent {
  store = inject(Store);

  boardCfg = input.required<BoardCfg>();

  allExistingTagIds = toSignal(this.store.select(selectAllTagIds), { initialValue: [] });

  missingTagIds = computed(() => {
    const allExistingTagIds: string[] = this.allExistingTagIds() as string[];
    const allPanelTagIds = this.boardCfg().panels.reduce<string[]>((acc, panel) => {
      return [...acc, ...(panel.includedTagIds || []), ...(panel.excludedTagIds || [])];
    }, []);
    return unique(allPanelTagIds.filter((tagId) => !allExistingTagIds.includes(tagId)));
  });

  createTags(): void {
    const missingTagIds = this.missingTagIds();
    if (missingTagIds.length) {
      missingTagIds.forEach((tagId) => {
        const defaultTags = [IMPORTANT_TAG, URGENT_TAG];

        const tag = defaultTags.find((tagInner) => tagInner.id === tagId) || {
          ...DEFAULT_TAG,
          id: tagId,
          title: `some-tag-${tagId}`,
        };

        this.store.dispatch(addTag({ tag }));
      });
    }
  }
}
