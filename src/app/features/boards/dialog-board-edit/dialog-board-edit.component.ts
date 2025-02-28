import { ChangeDetectionStrategy, Component } from '@angular/core';

@Component({
  selector: 'dialog-board-edit',
  standalone: true,
  imports: [],
  templateUrl: './dialog-board-edit.component.html',
  styleUrl: './dialog-board-edit.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class DialogBoardEditComponent {}
