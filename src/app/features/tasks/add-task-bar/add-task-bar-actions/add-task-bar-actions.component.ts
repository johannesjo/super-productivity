import {
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
  input,
  LOCALE_ID,
  output,
  signal,
  viewChild,
} from '@angular/core';
import { MatButton } from '@angular/material/button';
import { MatIcon } from '@angular/material/icon';
import { MatTooltip } from '@angular/material/tooltip';
import { MatMenu, MatMenuItem, MatMenuTrigger } from '@angular/material/menu';
import { first, map } from 'rxjs/operators';
import { ProjectService } from '../../../project/project.service';
import { TagService } from '../../../tag/tag.service';
import { MatDialog } from '@angular/material/dialog';
import { DialogScheduleTaskComponent } from '../../../planner/dialog-schedule-task/dialog-schedule-task.component';
import { AddTaskBarStateService } from '../add-task-bar-state.service';
import { AddTaskBarParserService } from '../add-task-bar-parser.service';
import { ESTIMATE_OPTIONS } from '../add-task-bar.const';
import { stringToMs } from '../../../../ui/duration/string-to-ms.pipe';
import { msToString } from '../../../../ui/duration/ms-to-string.pipe';
import { getDbDateStr } from '../../../../util/get-db-date-str';
import { toSignal } from '@angular/core/rxjs-interop';
import { T } from '../../../../t.const';
import { TranslateModule, TranslateService } from '@ngx-translate/core';

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
    TranslateModule,
  ],
})
export class AddTaskBarActionsComponent {
  private readonly _projectService = inject(ProjectService);
  private readonly _tagService = inject(TagService);
  private readonly _matDialog = inject(MatDialog);
  stateService = inject(AddTaskBarStateService);
  private readonly _parserService = inject(AddTaskBarParserService);
  private readonly _locale = inject(LOCALE_ID);
  private readonly _translateService = inject(TranslateService);

  T = T;

  isHideDueBtn = input<boolean>(false);
  isHideTagBtn = input<boolean>(false);

  refocus = output<void>();

  // Menu state
  isProjectMenuOpen = signal<boolean>(false);
  isTagsMenuOpen = signal<boolean>(false);
  isEstimateMenuOpen = signal<boolean>(false);

  // State from service
  state = computed(() => this.stateService.state());
  hasNewTags = computed(() => this.state().newTagTitles.length > 0);
  isAutoDetected = computed(() => this.stateService.isAutoDetected());

  // Observables
  allProjects = toSignal(
    this._projectService.list$.pipe(
      map((projects) => projects.filter((p) => !p.isArchived && !p.isHiddenFromMenu)),
    ),
    { initialValue: [] },
  );
  allTags = toSignal(
    this._tagService.tagsNoMyDayAndNoList$,

    { initialValue: [] },
  );

  // Constants
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
    const date = new Date(state.date);
    if (this.isSameDate(date, today)) {
      return state.time || this._translateService.instant(T.F.TASK.ADD_TASK_BAR.TODAY);
    }
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);
    if (!state.time && this.isSameDate(date, tomorrow)) {
      return state.time || this._translateService.instant(T.F.TASK.ADD_TASK_BAR.TOMORROW);
    }
    const dateStr = date.toLocaleDateString(this._locale, {
      month: 'short',
      day: 'numeric',
    });
    return state.time ? `${dateStr} ${state.time}` : dateStr;
  });

  estimateDisplay = computed(() => {
    const estimate = this.state().estimate;
    return estimate ? msToString(estimate) : null;
  });

  openScheduleDialog(): void {
    const state = this.state();
    const dialogRef = this._matDialog.open(DialogScheduleTaskComponent, {
      data: {
        targetDay: state.date ? getDbDateStr(state.date) : undefined,
        targetTime: state.time || undefined,
        isSelectDueOnly: true,
      },
    });

    dialogRef.afterClosed().subscribe((result) => {
      if (result && typeof result === 'object' && result.date) {
        this.stateService.updateDate(result.date, result.time);
      }
      this.refocus.emit();
    });
  }

  hasSelectedTag(tagId: string): boolean {
    return this.state().tags.some((t) => t.id === tagId);
  }

  onEstimateInput(value: string): void {
    const ms = stringToMs(value);
    if (ms > 0) {
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
        this.refocus.emit();
      });
    }
  }

  onTagsMenuClick(event: Event): void {
    this.isTagsMenuOpen.set(true);
    const tagsTrigger = this.tagsMenuTrigger();
    if (tagsTrigger) {
      tagsTrigger.menuClosed.pipe(first()).subscribe(() => {
        this.isTagsMenuOpen.set(false);
        this.refocus.emit();
      });
    }
  }

  onEstimateMenuClick(event: Event): void {
    this.isEstimateMenuOpen.set(true);
    const estimateTrigger = this.estimateMenuTrigger();
    if (estimateTrigger) {
      estimateTrigger.menuClosed.pipe(first()).subscribe(() => {
        this.isEstimateMenuOpen.set(false);
        this.refocus.emit();
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
        this.refocus.emit();
      });
    }
  }

  clearDateWithSyntax(): void {
    const currentInput = this.stateService.inputTxt();
    const cleanedInput = this._parserService.removeShortSyntaxFromInput(
      currentInput,
      'date',
    );
    this.stateService.clearDate(cleanedInput);
  }

  clearTagsWithSyntax(): void {
    const currentInput = this.stateService.inputTxt();
    const cleanedInput = this._parserService.removeShortSyntaxFromInput(
      currentInput,
      'tags',
    );
    this.stateService.clearTags(cleanedInput);
  }

  clearEstimateWithSyntax(): void {
    const currentInput = this.stateService.inputTxt();
    const cleanedInput = this._parserService.removeShortSyntaxFromInput(
      currentInput,
      'estimate',
    );
    this.stateService.clearEstimate(cleanedInput);
  }

  toggleTagWithSyntax(tag: any): void {
    const currentInput = this.stateService.inputTxt();
    const isRemoving = this.hasSelectedTag(tag.id);

    if (isRemoving) {
      // If removing the tag, clean it from the input
      const cleanedInput = this._parserService.removeShortSyntaxFromInput(
        currentInput,
        'tags',
        tag.title,
      );
      this.stateService.toggleTag(tag, cleanedInput);
    } else {
      // If adding the tag, don't modify the input (let the parser handle it)
      this.stateService.toggleTag(tag);
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
