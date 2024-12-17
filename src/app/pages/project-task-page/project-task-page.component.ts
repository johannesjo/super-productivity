import { ChangeDetectionStrategy, Component } from '@angular/core';
import { WorkContextService } from '../../features/work-context/work-context.service';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';

@Component({
  selector: 'work-view-page',
  templateUrl: './project-task-page.component.html',
  styleUrls: ['./project-task-page.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  standalone: false,
})
export class ProjectTaskPageComponent {
  isShowBacklog$: Observable<boolean> = this.workContextService.activeWorkContext$.pipe(
    map((workContext) => !!workContext.isEnableBacklog),
  );

  constructor(public workContextService: WorkContextService) {}
}
