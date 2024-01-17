export enum BannerId {
  TakeABreak = 'TakeABreak',
  StartTrackingReminder = 'StartTrackingReminder',
  JiraUnblock = 'JiraUnblock',
  InstallWebApp = 'InstallWebApp',
  Offline = 'Offline',
  TimeEstimateExceeded = 'TimeEstimateExceeded',
  CalendarEvent = 'CalendarEvent',
}

export type BannerType = 'ERROR';

export interface BannerAction {
  label: string;
  fn: () => void;
}

export interface Banner {
  id: BannerId | string;
  msg: string;
  ico?: string;
  svgIco?: string;
  type?: BannerType;
  translateParams?: { [key: string]: string | number };
  action?: BannerAction;
  action2?: BannerAction;
  action3?: BannerAction;
  img?: string;
}
