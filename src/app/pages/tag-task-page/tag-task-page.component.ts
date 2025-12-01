import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { WorkContextService } from '../../features/work-context/work-context.service';
import { AsyncPipe } from '@angular/common';
import { WorkViewComponent } from '../../features/work-view/work-view.component';

@Component({
  selector: 'tag-task-page',
  templateUrl: './tag-task-page.component.html',
  styleUrls: ['./tag-task-page.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [AsyncPipe, WorkViewComponent],
})
export class TagTaskPageComponent {
  workContextService = inject(WorkContextService);
}
