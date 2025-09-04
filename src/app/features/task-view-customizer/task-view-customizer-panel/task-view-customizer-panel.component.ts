import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatSelectModule } from '@angular/material/select';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatSlideToggleModule } from '@angular/material/slide-toggle';
import { TaskViewCustomizerService } from '../task-view-customizer.service';
import { TranslatePipe } from '@ngx-translate/core';
import { T } from 'src/app/t.const';

@Component({
  selector: 'task-view-customizer-panel',
  templateUrl: './task-view-customizer-panel.component.html',
  styleUrls: ['./task-view-customizer-panel.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    MatFormFieldModule,
    MatSelectModule,
    MatInputModule,
    MatButtonModule,
    MatSlideToggleModule,
    TranslatePipe,
  ],
})
export class TaskViewCustomizerPanelComponent implements OnInit {
  customizerService = inject(TaskViewCustomizerService);

  T = T;
  selectedSort: string = 'default';
  selectedGroup: string = 'default';
  selectedFilter: string = 'default';
  filterInputValue: string = '';

  sortOptions = [
    { value: 'default', label: T.F.TASK_VIEW.CUSTOMIZER.SORT_DEFAULT },
    { value: 'name', label: T.F.TASK_VIEW.CUSTOMIZER.SORT_NAME },
    { value: 'scheduledDate', label: T.F.TASK_VIEW.CUSTOMIZER.SORT_SCHEDULED_DATE },
    { value: 'creationDate', label: T.F.TASK_VIEW.CUSTOMIZER.SORT_CREATION_DATE },
    { value: 'estimatedTime', label: T.F.TASK_VIEW.CUSTOMIZER.ESTIMATED_TIME },
    { value: 'timeSpent', label: T.F.TASK_VIEW.CUSTOMIZER.TIME_SPENT },
    // Reuse GROUP_TAG label for sorting by tag
    { value: 'tag', label: T.F.TASK_VIEW.CUSTOMIZER.GROUP_TAG },
  ];

  groupOptions = [
    { value: 'default', label: T.F.TASK_VIEW.CUSTOMIZER.GROUP_DEFAULT },
    { value: 'tag', label: T.F.TASK_VIEW.CUSTOMIZER.GROUP_TAG },
    { value: 'project', label: T.F.TASK_VIEW.CUSTOMIZER.GROUP_PROJECT },
    { value: 'scheduledDate', label: T.F.TASK_VIEW.CUSTOMIZER.GROUP_SCHEDULED_DATE },
  ];

  filterOptions = [
    { value: 'default', label: T.F.TASK_VIEW.CUSTOMIZER.FILTER_DEFAULT },
    { value: 'tag', label: T.F.TASK_VIEW.CUSTOMIZER.FILTER_TAG },
    { value: 'project', label: T.F.TASK_VIEW.CUSTOMIZER.FILTER_PROJECT },
    { value: 'scheduledDate', label: T.F.TASK_VIEW.CUSTOMIZER.FILTER_SCHEDULED_DATE },
    { value: 'estimatedTime', label: T.F.TASK_VIEW.CUSTOMIZER.FILTER_ESTIMATED_TIME },
    { value: 'timeSpent', label: T.F.TASK_VIEW.CUSTOMIZER.FILTER_TIME_SPENT },
  ];

  scheduledPresets = [
    { value: '0', label: T.F.TASK_VIEW.CUSTOMIZER.SCHEDULED_DEFAULT },
    { value: 'today', label: T.F.TASK_VIEW.CUSTOMIZER.SCHEDULED_TODAY },
    { value: 'tomorrow', label: T.F.TASK_VIEW.CUSTOMIZER.SCHEDULED_TOMORROW },
    { value: 'thisWeek', label: T.F.TASK_VIEW.CUSTOMIZER.SCHEDULED_THIS_WEEK },
    { value: 'nextWeek', label: T.F.TASK_VIEW.CUSTOMIZER.SCHEDULED_NEXT_WEEK },
    { value: 'thisMonth', label: T.F.TASK_VIEW.CUSTOMIZER.SCHEDULED_THIS_MONTH },
    { value: 'nextMonth', label: T.F.TASK_VIEW.CUSTOMIZER.SCHEDULED_NEXT_MONTH },
  ];

  timePresets = [
    { value: '0', label: T.F.TASK_VIEW.CUSTOMIZER.TIME_DEFAULT },
    { value: '600000', label: T.F.TASK_VIEW.CUSTOMIZER.TIME_10MIN },
    { value: '1800000', label: T.F.TASK_VIEW.CUSTOMIZER.TIME_30MIN },
    { value: '3600000', label: T.F.TASK_VIEW.CUSTOMIZER.TIME_1HOUR },
    { value: '7200000', label: T.F.TASK_VIEW.CUSTOMIZER.TIME_2HOUR },
  ];

  ngOnInit(): void {
    this.selectedSort = this.customizerService.selectedSort();
    this.selectedGroup = this.customizerService.selectedGroup();
    this.selectedFilter = this.customizerService.selectedFilter();
    this.filterInputValue = this.customizerService.filterInputValue();
  }

  onResetAll(): void {
    this.customizerService.resetAll();
  }
}
