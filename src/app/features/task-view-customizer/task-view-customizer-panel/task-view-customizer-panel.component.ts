import { Component } from '@angular/core';
import { ChangeDetectorRef, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatSelectModule } from '@angular/material/select';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatSlideToggleModule } from '@angular/material/slide-toggle';
import { TaskViewCustomizerService } from '../task-view-customizer.service';
import { Subscription } from 'rxjs';

@Component({
  selector: 'task-view-customizer-panel',
  templateUrl: './task-view-customizer-panel.component.html',
  styleUrls: ['./task-view-customizer-panel.component.scss'],
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    MatFormFieldModule,
    MatSelectModule,
    MatInputModule,
    MatButtonModule,
    MatSlideToggleModule,
  ],
})
export class TaskViewCustomizerPanelComponent implements OnInit, OnDestroy {
  selectedSort: string = 'default';
  selectedGroup: string = 'default';
  selectedFilter: string = 'default';
  filterInputValue: string = '';

  sortOptions = [
    { value: 'default', label: 'Default' },
    { value: 'name', label: 'Name' },
    { value: 'scheduledDate', label: 'Scheduled Date' },
    { value: 'creationDate', label: 'Creation Date' },
    { value: 'estimatedTime', label: 'Estimated Time' },
    { value: 'timeSpent', label: 'Time Spent' },
  ];

  groupOptions = [
    { value: 'default', label: 'None (Default)' },
    { value: 'tag', label: 'Tag' },
    { value: 'project', label: 'Project' },
    { value: 'scheduledDate', label: 'Scheduled Date' },
  ];

  filterOptions = [
    { value: 'default', label: 'All (Default)' },
    { value: 'tag', label: 'Tag' },
    { value: 'project', label: 'Project' },
    { value: 'scheduledDate', label: 'Scheduled Date' },
    { value: 'estimatedTime', label: 'Estimated Time' },
    { value: 'timeSpent', label: 'Time Spent' },
  ];

  scheduledPresets = [
    { value: '0', label: 'All (Default)' },
    { value: 'today', label: 'Today' },
    { value: 'tomorrow', label: 'Tomorrow' },
    { value: 'thisWeek', label: 'This Week' },
    { value: 'nextWeek', label: 'Next Week' },
    { value: 'thisMonth', label: 'This Month' },
    { value: 'nextMonth', label: 'Next Month' },
  ];

  timePresets = [
    { value: '0', label: 'All (Default)' },
    { value: '600000', label: '>10 min' },
    { value: '1800000', label: '>30 min' },
    { value: '3600000', label: '>1 hour' },
    { value: '7200000', label: '>2 hours' },
  ];

  private _subs = new Subscription();

  constructor(
    private customizerService: TaskViewCustomizerService,
    private cdRef: ChangeDetectorRef,
  ) {}

  ngOnInit(): void {
    this._subs.add(
      this.customizerService.selectedSort$.subscribe((val) => {
        this.selectedSort = val;
        this.cdRef.markForCheck();
      }),
    );
    this._subs.add(
      this.customizerService.selectedGroup$.subscribe((val) => {
        this.selectedGroup = val;
        this.cdRef.markForCheck();
      }),
    );
    this._subs.add(
      this.customizerService.selectedFilter$.subscribe((val) => {
        this.selectedFilter = val;
        this.cdRef.markForCheck();
      }),
    );
    this._subs.add(
      this.customizerService.filterInputValue$.subscribe((val) => {
        this.filterInputValue = val;
        this.cdRef.markForCheck();
      }),
    );
  }

  ngOnDestroy(): void {
    this._subs.unsubscribe();
  }

  onResetAll(): void {
    this.selectedSort = 'default';
    this.selectedGroup = 'default';
    this.selectedFilter = 'default';
    this.filterInputValue = '';
    this.applyTaskViewCustomizations();
  }

  applyTaskViewCustomizations(): void {
    this.customizerService.setSort(this.selectedSort);
    this.customizerService.setGroup(this.selectedGroup);
    this.customizerService.setFilter(this.selectedFilter, this.filterInputValue);
  }

  triggerEnterSubmit(event: KeyboardEvent): void {
    if (event.key === 'Enter') {
      this.applyTaskViewCustomizations();
    }
  }
}
