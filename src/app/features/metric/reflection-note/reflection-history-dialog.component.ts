import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { MAT_DIALOG_DATA, MatDialogModule } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { CommonModule, DatePipe } from '@angular/common';
import { TranslatePipe } from '@ngx-translate/core';
import { T } from '../../../t.const';

export interface ReflectionHistoryItem {
  day: string;
  text: string;
  created: number;
}

@Component({
  selector: 'reflection-history-dialog',
  templateUrl: './reflection-history-dialog.component.html',
  styleUrls: ['./reflection-history-dialog.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  standalone: true,
  imports: [MatDialogModule, MatButtonModule, CommonModule, DatePipe, TranslatePipe],
})
export class ReflectionHistoryDialogComponent {
  readonly data = inject<{ entries: ReflectionHistoryItem[] }>(MAT_DIALOG_DATA);
  readonly T = T;
}
