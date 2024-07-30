import { ChangeDetectionStrategy, Component } from '@angular/core';
import { BaseComponent } from '../../core/base-component/base.component';
import { Store } from '@ngrx/store';
import { DateService } from '../../core/date/date.service';
import { LayoutService } from '../../core-ui/layout/layout.service';
import { PlannerActions } from './store/planner.actions';

@Component({
  selector: 'planner',
  templateUrl: './planner.component.html',
  styleUrl: './planner.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PlannerComponent extends BaseComponent {
  isPanelOpen = false;

  constructor(
    private _store: Store,
    private _dateService: DateService,
    public layoutService: LayoutService,
  ) {
    super();
    this._store.dispatch(
      PlannerActions.cleanupOldAndUndefinedPlannerTasks({
        today: this._dateService.todayStr(),
      }),
    );
  }
}
