import { MatSnackBarConfig } from '@angular/material';

export type SnackType = 'ERROR' | 'SUCCESS'| 'GOOGLE_LOGIN';

export interface SnackParams {
  message: string;
  type?: SnackType;
  icon?: string;
  actionStr?: string;
  actionId?: string;
  delay?: number;
  config?: MatSnackBarConfig;
}
