import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { T } from '../../../t.const';
import { PlannerDay } from '../planner.model';
import { PlannerService } from '../planner.service';
import { PlannerDayComponent } from '../planner-day/planner-day.component';
import { AsyncPipe } from '@angular/common';

@Component({
  selector: 'planner-plan-view',
  templateUrl: './planner-plan-view.component.html',
  styleUrl: './planner-plan-view.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [PlannerDayComponent, AsyncPipe],
})
export class PlannerPlanViewComponent {
  private _plannerService = inject(PlannerService);

  days$: Observable<PlannerDay[]> = this._plannerService.days$;

  protected readonly T = T;
}
