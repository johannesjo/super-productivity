import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { WorkContextService } from '../../features/work-context/work-context.service';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { AsyncPipe } from '@angular/common';
import { WorkViewComponent } from '../../features/work-view/work-view.component';

@Component({
  selector: 'work-view-page',
  templateUrl: './project-task-page.component.html',
  styleUrls: ['./project-task-page.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [AsyncPipe, WorkViewComponent],
})
export class ProjectTaskPageComponent {
  workContextService = inject(WorkContextService);

  isShowBacklog$: Observable<boolean> = this.workContextService.activeWorkContext$.pipe(
    map((workContext) => !!workContext.isEnableBacklog),
  );
}
