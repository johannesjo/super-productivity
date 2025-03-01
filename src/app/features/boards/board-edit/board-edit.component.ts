import {
  ChangeDetectionStrategy,
  Component,
  inject,
  model,
  OnInit,
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
import { MatMenuItem } from '@angular/material/menu';
import { Store } from '@ngrx/store';
import { BoardsActions } from '../store/boards.actions';

@Component({
  selector: 'board-edit',
  standalone: true,
  imports: [FormlyModule, MatButton, MatIcon, TranslatePipe, MatMenuItem],
  templateUrl: './board-edit.component.html',
  styleUrl: './board-edit.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class BoardEditComponent implements OnInit {
  store = inject(Store);
  boardCfg = model.required<BoardCfg>();
  isEdit = signal(false);

  form: UntypedFormGroup = new UntypedFormGroup({});

  protected readonly BOARDS_FORM = BOARDS_FORM;

  ngOnInit(): void {
    if (this.boardCfg().id) {
      this.isEdit.set(true);
    } else {
      this.boardCfg.set({ ...this.boardCfg(), id: nanoid() });
    }
  }

  protected readonly T = T;

  save(): void {
    console.log(this.form.valid, this.isEdit());

    if (this.form.valid) {
      if (this.isEdit()) {
        this.store.dispatch(
          BoardsActions.updateBoard({ id: this.boardCfg().id, updates: this.boardCfg() }),
        );
      } else {
        this.store.dispatch(BoardsActions.addBoard({ board: this.boardCfg() }));
      }
    }
  }

  removeBoard(): void {
    this.store.dispatch(BoardsActions.removeBoard({ id: this.boardCfg().id }));
  }
}
