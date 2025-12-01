import { EntityState } from '@ngrx/entity';

// TODO: Remove in future version - kept for backward compatibility only
// This feature has been removed but types are kept for data migration

export interface Improvement {
  id: string;
  title: string;
  note?: string;
  checkedDays?: string[];
  isRepeat?: boolean;
}

export interface ImprovementState extends EntityState<Improvement> {
  hiddenImprovementBannerItems: string[];
}
