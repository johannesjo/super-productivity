import { EntityState } from '@ngrx/entity';

export interface ImprovementCopy {
  id: string;
  title: string;
  checkedDays?: string[];
  isRepeat?: boolean;
}

export type Improvement = Readonly<ImprovementCopy>;

export interface ImprovementState extends EntityState<Improvement> {
  hiddenImprovementBannerItems: string[];
  hideDay: string | null;
}
