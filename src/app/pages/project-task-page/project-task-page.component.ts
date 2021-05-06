import { ChangeDetectionStrategy, Component } from '@angular/core';
import { WorkContextService } from '../../features/work-context/work-context.service';

@Component({
  selector: 'work-view-page',
  templateUrl: './project-task-page.component.html',
  styleUrls: ['./project-task-page.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ProjectTaskPageComponent {
  constructor(public workContextService: WorkContextService) {}
}
