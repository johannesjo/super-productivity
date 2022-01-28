import { Injectable } from '@angular/core';
import { select, Store } from '@ngrx/store';
import {
  selectAllImprovements,
  selectRepeatedImprovementIds,
} from './store/improvement.reducer';
import {
  addImprovement,
  addImprovementCheckedDay,
  clearHiddenImprovements,
  deleteImprovement,
  deleteImprovements,
  disableImprovementRepeat,
  hideImprovement,
  toggleImprovementRepeat,
  updateImprovement,
} from './store/improvement.actions';
import { Observable } from 'rxjs';
import { Improvement, ImprovementState } from './improvement.model';
import { nanoid } from 'nanoid';
import {
  selectHasLastTrackedImprovements,
  selectImprovementBannerImprovements,
} from '../store/metric.selectors';
import { getWorklogStr } from '../../../util/get-work-log-str';

@Injectable({
  providedIn: 'root',
})
export class ImprovementService {
  improvements$: Observable<Improvement[]> = this._store$.pipe(
    select(selectAllImprovements),
  );
  repeatedImprovementIds$: Observable<string[]> = this._store$.pipe(
    select(selectRepeatedImprovementIds),
  );
  improvementBannerImprovements$: Observable<Improvement[] | null> = this._store$.pipe(
    select(selectImprovementBannerImprovements),
  );
  hasLastTrackedImprovements$: Observable<boolean> = this._store$.pipe(
    select(selectHasLastTrackedImprovements),
  );

  constructor(private _store$: Store<ImprovementState>) {}

  addImprovement(title: string): string {
    const id = nanoid();
    this._store$.dispatch(
      addImprovement({
        improvement: {
          title,
          id,
          isRepeat: false,
          checkedDays: [],
        },
      }),
    );
    return id;
  }

  addCheckedDay(id: string, checkedDay: string = getWorklogStr()): void {
    this._store$.dispatch(
      addImprovementCheckedDay({
        id,
        checkedDay,
      }),
    );
  }

  deleteImprovement(id: string): void {
    this._store$.dispatch(deleteImprovement({ id }));
  }

  deleteImprovements(ids: string[]): void {
    this._store$.dispatch(deleteImprovements({ ids }));
  }

  updateImprovement(id: string, changes: Partial<Improvement>): void {
    this._store$.dispatch(updateImprovement({ improvement: { id, changes } }));
  }

  hideImprovement(id: string): void {
    this._store$.dispatch(hideImprovement({ id }));
  }

  toggleImprovementRepeat(id: string): void {
    this._store$.dispatch(toggleImprovementRepeat({ id }));
  }

  disableImprovementRepeat(id: string): void {
    this._store$.dispatch(disableImprovementRepeat({ id }));
  }

  clearHiddenImprovements(): void {
    this._store$.dispatch(clearHiddenImprovements());
  }
}
