import {MatSnackBarConfig} from '@angular/material/snack-bar';
import {Observable} from 'rxjs';

export type SnackType = 'ERROR' | 'SUCCESS' | 'CUSTOM' | 'JIRA_UNBLOCK';

export interface SnackParams {
  msg: string;
  isSubtle?: boolean;
  type?: SnackType;
  ico?: string;
  svgIco?: string;
  actionStr?: string;
  actionId?: string;
  actionFn?: Function;
  actionPayload?: any;
  config?: MatSnackBarConfig;
  promise?: Promise<any>;
  showWhile$?: Observable<any>;
}
