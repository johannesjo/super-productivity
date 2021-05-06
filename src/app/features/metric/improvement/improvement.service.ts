import { Injectable } from '@angular/core';
import { select, Store } from '@ngrx/store';
import {
  selectAllImprovements,
  selectRepeatedImprovementIds,
} from './store/improvement.reducer';
import {
  AddImprovement,
  AddImprovementCheckedDay,
  ClearHiddenImprovements,
  DeleteImprovement,
  DeleteImprovements,
  DisableImprovementRepeat,
  HideImprovement,
  ToggleImprovementRepeat,
  UpdateImprovement,
} from './store/improvement.actions';
import { Observable } from 'rxjs';
import { Improvement, ImprovementState } from './improvement.model';
import * as shortid from 'shortid';
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
    const id = shortid();
    this._store$.dispatch(
      new AddImprovement({
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

  addCheckedDay(id: string, checkedDay: string = getWorklogStr()) {
    this._store$.dispatch(
      new AddImprovementCheckedDay({
        id,
        checkedDay,
      }),
    );
  }

  deleteImprovement(id: string) {
    this._store$.dispatch(new DeleteImprovement({ id }));
  }

  deleteImprovements(ids: string[]) {
    this._store$.dispatch(new DeleteImprovements({ ids }));
  }

  updateImprovement(id: string, changes: Partial<Improvement>) {
    this._store$.dispatch(new UpdateImprovement({ improvement: { id, changes } }));
  }

  hideImprovement(id: string) {
    this._store$.dispatch(new HideImprovement({ id }));
  }

  toggleImprovementRepeat(id: string) {
    this._store$.dispatch(new ToggleImprovementRepeat({ id }));
  }

  disableImprovementRepeat(id: string) {
    this._store$.dispatch(new DisableImprovementRepeat({ id }));
  }

  clearHiddenImprovements() {
    this._store$.dispatch(new ClearHiddenImprovements());
  }
}
