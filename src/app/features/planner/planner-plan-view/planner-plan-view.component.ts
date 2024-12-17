import { ChangeDetectionStrategy, Component } from '@angular/core';
import { Observable } from 'rxjs';
import { T } from '../../../t.const';
import { PlannerDay } from '../planner.model';
import { PlannerService } from '../planner.service';

@Component({
  selector: 'planner-plan-view',
  templateUrl: './planner-plan-view.component.html',
  styleUrl: './planner-plan-view.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
  standalone: false,
})
export class PlannerPlanViewComponent {
  days$: Observable<PlannerDay[]> = this._plannerService.days$;

  protected readonly T = T;

  constructor(private _plannerService: PlannerService) {}
}
