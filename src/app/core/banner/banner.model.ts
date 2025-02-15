import { Observable } from 'rxjs';

export enum BannerId {
  TakeABreak = 'TakeABreak',
  StartTrackingReminder = 'StartTrackingReminder',
  JiraUnblock = 'JiraUnblock',
  InstallWebApp = 'InstallWebApp',
  Offline = 'Offline',
  TimeEstimateExceeded = 'TimeEstimateExceeded',
  CalendarEvent = 'CalendarEvent',
  ReminderCountdown = 'ReminderCountdown',
  FocusMode = 'FocusMode',
  SimpleCounterCountdownComplete = 'SimpleCounterCountdownComplete',
}

export type BannerType = 'ERROR';

export interface BannerAction {
  label: string;
  fn: () => void;
}

export interface Banner {
  id: BannerId;
  msg: string;
  ico?: string;
  svgIco?: string;
  type?: BannerType;
  translateParams?: { [key: string]: string | number };
  action?: BannerAction;
  action2?: BannerAction;
  action3?: BannerAction;
  isHideDismissBtn?: boolean;
  progress$?: Observable<number>;
  timer$?: Observable<number>;
  hideWhen$?: Observable<unknown>;
  img?: string;
}
