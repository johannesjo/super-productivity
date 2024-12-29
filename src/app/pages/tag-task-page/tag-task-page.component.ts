import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { WorkContextService } from '../../features/work-context/work-context.service';

@Component({
  selector: 'tag-task-page',
  templateUrl: './tag-task-page.component.html',
  styleUrls: ['./tag-task-page.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  standalone: false,
})
export class TagTaskPageComponent {
  workContextService = inject(WorkContextService);
}
