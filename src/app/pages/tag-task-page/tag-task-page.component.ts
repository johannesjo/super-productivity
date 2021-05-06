import { ChangeDetectionStrategy, Component } from '@angular/core';
import { WorkContextService } from '../../features/work-context/work-context.service';

@Component({
  selector: 'tag-task-page',
  templateUrl: './tag-task-page.component.html',
  styleUrls: ['./tag-task-page.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class TagTaskPageComponent {
  constructor(public workContextService: WorkContextService) {}
}
