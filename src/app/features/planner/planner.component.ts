import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { Store } from '@ngrx/store';
import { DateService } from '../../core/date/date.service';
import { LayoutService } from '../../core-ui/layout/layout.service';
import { PlannerActions } from './store/planner.actions';
import { selectTaskFeatureState } from '../tasks/store/task.selectors';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { T } from '../../t.const';
import { BetterSimpleDrawerComponent } from '../../ui/better-simple-drawer/better-simple-drawer.component';
import { CdkDropListGroup } from '@angular/cdk/drag-drop';
import { PlannerPlanViewComponent } from './planner-plan-view/planner-plan-view.component';
import { CdkScrollable } from '@angular/cdk/scrolling';
import { AddTaskPanelPlannerComponent } from './add-task-panel-planner/add-task-panel-planner.component';
import { MatFabButton } from '@angular/material/button';
import { MatIcon } from '@angular/material/icon';
import { MatTooltip } from '@angular/material/tooltip';
import { TranslatePipe } from '@ngx-translate/core';

@Component({
  selector: 'planner',
  templateUrl: './planner.component.html',
  styleUrl: './planner.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    BetterSimpleDrawerComponent,
    CdkDropListGroup,
    PlannerPlanViewComponent,
    CdkScrollable,
    AddTaskPanelPlannerComponent,
    MatFabButton,
    MatIcon,
    MatTooltip,
    TranslatePipe,
  ],
})
export class PlannerComponent {
  private _store = inject(Store);
  private _dateService = inject(DateService);
  layoutService = inject(LayoutService);

  readonly T = T;
  isPanelOpen = false;

  constructor() {
    this._store
      .select(selectTaskFeatureState)
      .pipe(takeUntilDestroyed())
      .subscribe((taskState) => {
        this._store.dispatch(
          PlannerActions.cleanupOldAndUndefinedPlannerTasks({
            today: this._dateService.todayStr(),
            allTaskIds: taskState.ids as string[],
          }),
        );
      });
  }
}
