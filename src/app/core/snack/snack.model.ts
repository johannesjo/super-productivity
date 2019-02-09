import { MatSnackBarConfig } from '@angular/material';
import { Observable } from 'rxjs';

export type SnackType = 'ERROR' | 'SUCCESS' | 'CUSTOM' | 'GOOGLE_LOGIN' | 'GLOBAL_ERROR' | 'JIRA_UNBLOCK';

export interface SnackParams {
  message: string;
  isSubtle?: boolean;
  type?: SnackType;
  icon?: string;
  svgIcon?: string;
  actionStr?: string;
  actionId?: string;
  actionFn?: Function;
  actionPayload?: any;
  config?: MatSnackBarConfig;
  promise?: Promise<any>;
  showWhile$?: Observable<any>;
}
