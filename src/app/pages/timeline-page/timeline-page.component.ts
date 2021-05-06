import { ChangeDetectionStrategy, Component } from '@angular/core';
import { WorkContextService } from '../../features/work-context/work-context.service';

@Component({
  selector: 'timeline-page',
  templateUrl: './timeline-page.component.html',
  styleUrls: ['./timeline-page.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class TimelinePageComponent {
  constructor(public workContextService: WorkContextService) {}
}
