/* eslint-disable @typescript-eslint/naming-convention */
import {
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
  input,
} from '@angular/core';
import { BoardCfg } from '../boards.model';
import { BoardPanelComponent } from '../board-panel/board-panel.component';
import { MatButton } from '@angular/material/button';
import { MatIcon } from '@angular/material/icon';
import { toSignal } from '@angular/core/rxjs-interop';
import { Store } from '@ngrx/store';
import { selectAllTagIds } from '../../tag/store/tag.reducer';
import { unique } from '../../../util/unique';
import { addTag } from '../../tag/store/tag.actions';
import {
  DEFAULT_TAG,
  IMPORTANT_TAG,
  IN_PROGRESS_TAG,
  URGENT_TAG,
} from '../../tag/tag.const';
import { TranslatePipe, TranslateService } from '@ngx-translate/core';
import { MatDialog } from '@angular/material/dialog';
import { DialogBoardEditComponent } from '../dialog-board-edit/dialog-board-edit.component';
import { T } from '../../../t.const';

@Component({
  selector: 'board',
  standalone: true,
  imports: [BoardPanelComponent, MatIcon, MatButton, TranslatePipe],
  templateUrl: './board.component.html',
  styleUrl: './board.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {
    '[style.--cols]': 'missingTagIds().length === 0 && boardCfg().cols',
  },
})
export class BoardComponent {
  private _store = inject(Store);
  private _translateService = inject(TranslateService);
  private _matDialog = inject(MatDialog);

  boardCfg = input.required<BoardCfg>();

  allExistingTagIds = toSignal(this._store.select(selectAllTagIds), { initialValue: [] });

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
        const defaultTags = [IMPORTANT_TAG, URGENT_TAG, IN_PROGRESS_TAG];

        const defaultTag = defaultTags.find((tagInner) => tagInner.id === tagId);

        const tag = defaultTag
          ? {
              ...defaultTag,
              title: this._translateService.instant(defaultTag.title),
            }
          : {
              ...DEFAULT_TAG,
              id: tagId,
              title: `some-tag-${tagId}`,
            };

        this._store.dispatch(addTag({ tag }));
      });
    }
  }

  editBoard(): void {
    this._matDialog.open(DialogBoardEditComponent, {
      data: {
        board: this.boardCfg(),
      },
    });
  }

  protected readonly T = T;
}
