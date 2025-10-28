import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { CommonModule, DecimalPipe } from '@angular/common';
import { AsyncPipe } from '@angular/common';
import { Observable } from 'rxjs';
import { MetricService, ProductivityBreakdownItem } from '../metric.service';

interface DialogProductivityBreakdownData {
  days: number;
  endDate?: string;
}

@Component({
  selector: 'dialog-productivity-breakdown',
  standalone: true,
  templateUrl: './dialog-productivity-breakdown.component.html',
  styleUrls: ['./dialog-productivity-breakdown.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CommonModule, MatDialogModule, MatButtonModule, AsyncPipe, DecimalPipe],
})
export class DialogProductivityBreakdownComponent {
  private _metricService = inject(MetricService);
  private _dialogRef =
    inject<MatDialogRef<DialogProductivityBreakdownComponent>>(MatDialogRef);
  private _data = inject<DialogProductivityBreakdownData>(MAT_DIALOG_DATA);

  breakdown$: Observable<ProductivityBreakdownItem[]> =
    this._metricService.getProductivityBreakdown$(this._data.days, this._data.endDate);

  close(): void {
    this._dialogRef.close();
  }
}
