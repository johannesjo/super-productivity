import {
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
  output,
  signal,
  viewChild,
} from '@angular/core';
import { MatButton } from '@angular/material/button';
import { MatIcon } from '@angular/material/icon';
import { MatTooltip } from '@angular/material/tooltip';
import { MatMenu, MatMenuItem, MatMenuTrigger } from '@angular/material/menu';
import { AsyncPipe } from '@angular/common';
import { first, map } from 'rxjs/operators';
import { ProjectService } from '../../../project/project.service';
import { TagService } from '../../../tag/tag.service';
import { MatDialog } from '@angular/material/dialog';
import { DialogScheduleTaskComponent } from '../../../planner/dialog-schedule-task/dialog-schedule-task.component';
import { AddTaskBarStateService } from '../add-task-bar-state.service';
import { DATE_OPTIONS, ESTIMATE_OPTIONS, TIME_OPTIONS } from '../add-task-bar.const';
import { stringToMs } from '../../../../ui/duration/string-to-ms.pipe';
import { msToString } from '../../../../ui/duration/ms-to-string.pipe';

@Component({
  selector: 'add-task-bar-actions',
  templateUrl: './add-task-bar-actions.component.html',
  styleUrls: ['./add-task-bar-actions.component.scss', '../add-task-bar.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  standalone: true,
  imports: [
    MatButton,
    MatIcon,
    MatTooltip,
    MatMenu,
    MatMenuTrigger,
    MatMenuItem,
    AsyncPipe,
  ],
})
export class AddTaskBarActionsComponent {
  private readonly _projectService = inject(ProjectService);
  private readonly _tagService = inject(TagService);
  private readonly _matDialog = inject(MatDialog);
  stateService = inject(AddTaskBarStateService);

  // Menu state
  isProjectMenuOpen = signal<boolean>(false);
  isTagsMenuOpen = signal<boolean>(false);
  isEstimateMenuOpen = signal<boolean>(false);

  // State from service
  state = computed(() => this.stateService.state());
  hasNewTags = computed(() => this.state().newTagTitles.length > 0);
  isAutoDetected = computed(() => this.stateService.isAutoDetected());

  // Observables
  projects$ = this._projectService.list$.pipe(
    map((projects) => projects.filter((p) => !p.isArchived && !p.isHiddenFromMenu)),
  );
  tags$ = this._tagService.tags$;

  // Constants
  readonly DATE_OPTIONS = DATE_OPTIONS;
  readonly TIME_OPTIONS = TIME_OPTIONS;
  readonly ESTIMATE_OPTIONS = ESTIMATE_OPTIONS;

  // View children
  projectMenuTrigger = viewChild('projectMenuTrigger', { read: MatMenuTrigger });
  tagsMenuTrigger = viewChild('tagsMenuTrigger', { read: MatMenuTrigger });
  estimateMenuTrigger = viewChild('estimateMenuTrigger', { read: MatMenuTrigger });

  // Outputs
  estimateChanged = output<string>();

  // Computed values
  dateDisplay = computed(() => {
    const state = this.state();
    if (!state.date) return null;
    const today = new Date();
    const date = state.date;
    if (this.isSameDate(date, today)) {
      return state.time || 'Today';
    }
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);
    if (this.isSameDate(date, tomorrow)) {
      return state.time || 'Tomorrow';
    }
    const dateStr = date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    return state.time ? `${dateStr} ${state.time}` : dateStr;
  });

  estimateDisplay = computed(() => {
    const estimate = this.state().estimate;
    return estimate ? msToString(estimate) : null;
  });

  openScheduleDialog(): void {
    const dialogRef = this._matDialog.open(DialogScheduleTaskComponent, {
      width: '400px',
      data: {
        date: this.state().date,
        time: this.state().time,
      },
    });

    dialogRef.afterClosed().subscribe((result) => {
      if (result && typeof result === 'object' && result.date) {
        this.stateService.updateDate(result.date, result.time);
      }
    });
  }

  hasSelectedTag(tagId: string): boolean {
    return this.state().tags.some((t) => t.id === tagId);
  }

  onEstimateInput(value: string): void {
    const ms = stringToMs(value);
    if (ms !== null) {
      this.stateService.updateEstimate(ms);
      this.estimateChanged.emit(value);
    }
  }

  onProjectMenuClick(event: Event): void {
    this.isProjectMenuOpen.set(true);
    const projectTrigger = this.projectMenuTrigger();
    if (projectTrigger) {
      projectTrigger.menuClosed.pipe(first()).subscribe(() => {
        this.isProjectMenuOpen.set(false);
      });
    }
  }

  onTagsMenuClick(event: Event): void {
    this.isTagsMenuOpen.set(true);
    const tagsTrigger = this.tagsMenuTrigger();
    if (tagsTrigger) {
      tagsTrigger.menuClosed.pipe(first()).subscribe(() => {
        this.isTagsMenuOpen.set(false);
      });
    }
  }

  onEstimateMenuClick(event: Event): void {
    this.isEstimateMenuOpen.set(true);
    const estimateTrigger = this.estimateMenuTrigger();
    if (estimateTrigger) {
      estimateTrigger.menuClosed.pipe(first()).subscribe(() => {
        this.isEstimateMenuOpen.set(false);
      });
    }
  }

  // Public method to open project menu programmatically
  openProjectMenu(): void {
    const projectTrigger = this.projectMenuTrigger();
    if (projectTrigger) {
      this.isProjectMenuOpen.set(true);
      projectTrigger.openMenu();
      projectTrigger.menuClosed.pipe(first()).subscribe(() => {
        this.isProjectMenuOpen.set(false);
      });
    }
  }

  private isSameDate(date1: Date, date2: Date): boolean {
    return (
      date1.getFullYear() === date2.getFullYear() &&
      date1.getMonth() === date2.getMonth() &&
      date1.getDate() === date2.getDate()
    );
  }
}
