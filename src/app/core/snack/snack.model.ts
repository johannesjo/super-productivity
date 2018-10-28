import { MatSnackBarConfig } from '@angular/material';

export type SnackType = 'ERROR' | 'SUCCESS';

export interface SnackParams {
  message: string;
  type?: SnackType;
  actionStr?: string;
  actionId?: string;
  delay?: number;
  config?: MatSnackBarConfig;
}
