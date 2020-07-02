import { ChangeDetectionStrategy, Component } from '@angular/core';
import { WorkContextService } from '../../../features/work-context/work-context.service';

@Component({
  selector: 'plan-tasks-tomorrow',
  templateUrl: './plan-tasks-tomorrow.component.html',
  styleUrls: ['./plan-tasks-tomorrow.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class PlanTasksTomorrowComponent {

  constructor(
    public workContextService: WorkContextService,
  ) {
  }
}
