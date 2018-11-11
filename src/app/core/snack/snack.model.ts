import { MatSnackBarConfig } from '@angular/material';

export type SnackType = 'ERROR' | 'SUCCESS' | 'CUSTOM' | 'GOOGLE_LOGIN';

export interface SnackParams {
  message: string;
  type?: SnackType;
  icon?: string;
  actionStr?: string;
  actionId?: string;
  duration?: number;
  delay?: number;
  config?: MatSnackBarConfig;
  promise?: Promise<any>;
}
