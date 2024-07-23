import { ChangeDetectionStrategy, Component } from '@angular/core';
import { UiModule } from '../../../ui/ui.module';

@Component({
  selector: 'schedule',
  standalone: true,
  imports: [UiModule],
  templateUrl: './schedule.component.html',
  styleUrl: './schedule.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ScheduleComponent {}
