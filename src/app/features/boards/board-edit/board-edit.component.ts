import { ChangeDetectionStrategy, Component, model, OnInit } from '@angular/core';
import { FormlyModule } from '@ngx-formly/core';
import { BoardCfg } from '../boards.model';
import { BOARDS_FORM } from '../boards-form.const';
import { UntypedFormGroup } from '@angular/forms';
import { nanoid } from 'nanoid';

@Component({
  selector: 'board-edit',
  standalone: true,
  imports: [FormlyModule],
  templateUrl: './board-edit.component.html',
  styleUrl: './board-edit.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class BoardEditComponent implements OnInit {
  // boardCfg = input.required<BoardCfg>();
  boardCfg = model.required<BoardCfg>();

  form: UntypedFormGroup = new UntypedFormGroup({});

  protected readonly BOARDS_FORM = BOARDS_FORM;

  ngOnInit(): void {
    if (!this.boardCfg().id) {
      this.boardCfg.set({ ...this.boardCfg(), id: nanoid() });
    }
  }
}
