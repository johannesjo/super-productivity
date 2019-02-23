export type BannerId = 'TAKE_A_BREAK';

export interface BannerAction {
  label: string;
  fn: () => void;
}

export interface Banner {
  id: BannerId;
  msg: string;
  ico?: string;
  action?: BannerAction;
  action2?: BannerAction;
}
