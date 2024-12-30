import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { WorkContextService } from '../../features/work-context/work-context.service';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { WorkViewModule } from '../../features/work-view/work-view.module';
import { AsyncPipe } from '@angular/common';

@Component({
  selector: 'work-view-page',
  templateUrl: './project-task-page.component.html',
  styleUrls: ['./project-task-page.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [WorkViewModule, AsyncPipe],
})
export class ProjectTaskPageComponent {
  workContextService = inject(WorkContextService);

  isShowBacklog$: Observable<boolean> = this.workContextService.activeWorkContext$.pipe(
    map((workContext) => !!workContext.isEnableBacklog),
  );
}
