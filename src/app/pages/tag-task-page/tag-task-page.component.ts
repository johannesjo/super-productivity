import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { WorkContextService } from '../../features/work-context/work-context.service';
import { WorkViewModule } from '../../features/work-view/work-view.module';
import { AsyncPipe } from '@angular/common';

@Component({
  selector: 'tag-task-page',
  templateUrl: './tag-task-page.component.html',
  styleUrls: ['./tag-task-page.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [WorkViewModule, AsyncPipe],
})
export class TagTaskPageComponent {
  workContextService = inject(WorkContextService);
}
