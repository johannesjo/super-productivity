import { ChangeDetectionStrategy, Component } from '@angular/core';
import { UiModule } from 'src/app/ui/ui.module';

@Component({
  selector: 'simple-schedule-picker',
  standalone: true,
  imports: [UiModule],
  templateUrl: './simple-schedule-picker.component.html',
  styleUrl: './simple-schedule-picker.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SimpleSchedulePickerComponent {}
