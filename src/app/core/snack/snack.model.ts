import { MatSnackBarConfig } from '@angular/material';

export type SnackType = 'ERROR' | 'SUCCESS' | 'CUSTOM' | 'GOOGLE_LOGIN' | 'JIRA_UNBLOCK';

export interface SnackParams {
  message: string;
  type?: SnackType;
  icon?: string;
  svgIcon?: string;
  actionStr?: string;
  actionId?: string;
  actionFn?: Function;
  actionPayload?: any;
  config?: MatSnackBarConfig;
  promise?: Promise<any>;
}
