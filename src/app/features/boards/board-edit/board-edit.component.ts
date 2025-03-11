import {
  ChangeDetectionStrategy,
  Component,
  inject,
  input,
  model,
  OnInit,
  output,
  signal,
} from '@angular/core';
import { FormlyModule } from '@ngx-formly/core';
import { BoardCfg } from '../boards.model';
import { BOARDS_FORM } from '../boards-form.const';
import { UntypedFormGroup } from '@angular/forms';
import { nanoid } from 'nanoid';
import { MatButton } from '@angular/material/button';
import { MatIcon } from '@angular/material/icon';
import { TranslatePipe } from '@ngx-translate/core';
import { T } from '../../../t.const';
import { Store } from '@ngrx/store';
import { BoardsActions } from '../store/boards.actions';
import { DEFAULT_BOARD_CFG } from '../boards.const';

@Component({
  selector: 'board-edit',
  standalone: true,
  imports: [FormlyModule, MatButton, MatIcon, TranslatePipe],
  templateUrl: './board-edit.component.html',
  styleUrl: './board-edit.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class BoardEditComponent implements OnInit {
  store = inject(Store);
  boardCfg = model.required<BoardCfg>();
  isEdit = signal(false);
  isHideBtns = input<boolean>(false);
  afterSave = output<void>();

  form: UntypedFormGroup = new UntypedFormGroup({});

  protected readonly BOARDS_FORM = BOARDS_FORM;

  ngOnInit(): void {
    if (this.boardCfg().id) {
      this.isEdit.set(true);
    } else {
      this.boardCfg.set({ ...this.boardCfg(), id: nanoid() });
    }

    // be safe with legacy data (only required for my current SP config)
    this.boardCfg.set({
      ...DEFAULT_BOARD_CFG,
      ...this.boardCfg(),
    });
  }

  protected readonly T = T;

  save(): void {
    if (this.form.valid) {
      if (this.isEdit()) {
        this.store.dispatch(
          BoardsActions.updateBoard({ id: this.boardCfg().id, updates: this.boardCfg() }),
        );
        this.afterSave.emit();
      } else {
        this.store.dispatch(BoardsActions.addBoard({ board: this.boardCfg() }));
        this.afterSave.emit();
      }
    }
  }

  removeBoard(): void {
    this.store.dispatch(BoardsActions.removeBoard({ id: this.boardCfg().id }));
  }
}
