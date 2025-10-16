/* eslint-disable @typescript-eslint/naming-convention */
import {
  AfterViewInit,
  ChangeDetectionStrategy,
  Component,
  computed,
  ElementRef,
  inject,
  input,
  HostListener,
  LOCALE_ID,
  OnDestroy,
  OnInit,
  signal,
  viewChild,
} from '@angular/core';
import { ScheduleEvent } from '../schedule.model';
import { CdkDragMove, CdkDragRelease, CdkDragStart } from '@angular/cdk/drag-drop';
import { Store } from '@ngrx/store';
import { FH, SVEType } from '../schedule.const';
import { isDraggableSE } from '../map-schedule-data/is-schedule-types-type';
import { throttle } from '../../../util/decorators';
import { CreateTaskPlaceholderComponent } from '../create-task-placeholder/create-task-placeholder.component';
import { ScheduleEventComponent } from '../schedule-event/schedule-event.component';
import { TranslatePipe, TranslateService } from '@ngx-translate/core';
import { MatIcon } from '@angular/material/icon';
import { T } from '../../../t.const';
import { IS_TOUCH_PRIMARY } from '../../../util/is-mouse-primary';
import { DRAG_DELAY_FOR_TOUCH } from '../../../app.constants';
import { MatTooltip } from '@angular/material/tooltip';
import { DateTimeFormatService } from '../../../core/date-time-format/date-time-format.service';
import { LocaleDatePipe } from '../../../ui/pipes/locale-date.pipe';
import { formatMonthDay } from '../../../util/format-month-day.util';
import { ScheduleWeekDragManager } from './schedule-week-drag.manager';
import type { DragPreviewContext } from './schedule-week-drag.types';
import { calculatePlaceholderForGridMove } from './schedule-week-placeholder.util';

const D_HOURS = 24;

@Component({
  selector: 'schedule-week',
  imports: [
    ScheduleEventComponent,
    CreateTaskPlaceholderComponent,
    MatIcon,
    TranslatePipe,
    MatTooltip,
    LocaleDatePipe,
  ],
  templateUrl: './schedule-week.component.html',
  styleUrl: './schedule-week.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
  standalone: true,
  host: {
    '[class.isCtrlKeyPressed]': 'isCtrlPressed()',
    '[class.isShiftKeyPressed]': 'isShiftNoScheduleMode()',
    '[class.is-dragging]': 'isDragging()',
    '[class.is-not-dragging]': '!isDragging()',
    '[class]': 'dragEventTypeClass()',
  },
})
export class ScheduleWeekComponent implements OnInit, AfterViewInit, OnDestroy {
  private _store = inject(Store);
  private _dateTimeFormatService = inject(DateTimeFormatService);
  private _translateService = inject(TranslateService);
  private _defaultLocale = inject(LOCALE_ID);

  isMinimalHeader = input<boolean>(false);
  events = input<ScheduleEvent[] | null>([]);
  beyondBudget = input<ScheduleEvent[][] | null>([]);
  daysToShow = input<string[]>([]);
  workStartEnd = input<{ workStartRow: number; workEndRow: number } | null>(null);
  currentTimeRow = input<number>(0);
  isCtrlPressed = signal<boolean>(false);
  isTaskDragActive = input<boolean>(false);

  // Track shift key during drag operations
  isShiftNoScheduleMode = signal(false);

  FH = FH;
  IS_TOUCH_PRIMARY = IS_TOUCH_PRIMARY;
  DRAG_DELAY_FOR_TOUCH = DRAG_DELAY_FOR_TOUCH;
  SVEType: typeof SVEType = SVEType;
  T: typeof T = T;
  protected readonly isDraggableSE = isDraggableSE;

  rowsByNr = Array.from({ length: D_HOURS * FH }, (_, index) => index).filter(
    (_, index) => index % FH === 0,
  );

  times = computed(() => {
    const is12Hour = !this._dateTimeFormatService.is24HourFormat();
    return this.rowsByNr.map((_, index) => {
      if (is12Hour) {
        if (index === 0) {
          return '12:00 AM'; // Midnight
        } else if (index === 12) {
          return '12:00 PM'; // Noon
        } else if (index < 12) {
          return index.toString() + ':00 AM';
        } else {
          return (index - 12).toString() + ':00 PM';
        }
      } else {
        return index.toString() + ':00';
      }
    });
  });

  endOfDayColRowStart = signal<number>(D_HOURS * 0.5 * FH);
  totalRows: number = D_HOURS * FH;

  safeEvents = computed(() => this.events() || []);
  safeBeyondBudget = computed(() => this.beyondBudget() || []);

  newTaskPlaceholder = signal<{
    style: string;
    time: string;
    date: string;
  } | null>(null);

  isDragging = signal(false);
  isDraggingDelayed = signal(false);
  isCreateTaskActive = signal(false);
  prevDragOverEl = signal<HTMLElement | null>(null);
  dragCloneEl = signal<HTMLElement | null>(null);

  // Drag preview properties for time indicator
  private _dragPreviewContext = signal<DragPreviewContext>(null);
  dragPreviewLabel = computed(() => {
    const ctx = this._dragPreviewContext();
    if (!ctx) {
      return null;
    }
    if (ctx.kind === 'time') {
      return this._dateTimeFormatService.formatTime(ctx.timestamp);
    }
    if (ctx.kind === 'shift') {
      const dateLabel = this._formatDateLabel(ctx.day);
      return this._translateService.instant(
        ctx.isEndOfDay ? T.F.SCHEDULE.PLAN_END_DAY : T.F.SCHEDULE.PLAN_START_DAY,
        { date: dateLabel },
      );
    }
    return ctx.label;
  });
  dragPreviewPosition = signal({ x: 0, y: 0 });
  currentDragEvent = signal<ScheduleEvent | null>(null);
  dragPreviewStyle = signal<string | null>(null);
  // Show shift key info tooltip
  showShiftKeyInfo = signal(false);
  private readonly _dragManager = new ScheduleWeekDragManager({
    isTouchPrimary: IS_TOUCH_PRIMARY,
    gridContainer: () => {
      try {
        return this.gridContainer().nativeElement as HTMLElement;
      } catch {
        return null;
      }
    },
    daysToShow: () => this.daysToShow() || [],
    isShiftMode: () => this.isShiftNoScheduleMode(),
    dragPreviewContext: this._dragPreviewContext,
    dragPreviewStyle: this.dragPreviewStyle,
    dragPreviewPosition: this.dragPreviewPosition,
    currentDragEvent: this.currentDragEvent,
    prevDragOverEl: this.prevDragOverEl,
    dragCloneEl: this.dragCloneEl,
    isDragging: this.isDragging,
    isDraggingDelayed: this.isDraggingDelayed,
    showShiftKeyInfo: this.showShiftKeyInfo,
    store: this._store,
  });

  // Track if any event is being resized
  isAnyEventResizing = signal(false);

  // Computed class for drag event type
  dragEventTypeClass = computed(() => {
    const currentEvent = this.currentDragEvent();
    return currentEvent ? currentEvent.type : '';
  });

  readonly gridContainer = viewChild.required<ElementRef>('gridContainer');

  private _currentAniTimeout: number | undefined;
  private _resizeObserver?: MutationObserver;

  ngOnInit(): void {
    const workStartEnd = this.workStartEnd();
    this.endOfDayColRowStart.set(workStartEnd?.workStartRow || D_HOURS * 0.5 * FH);
  }

  ngAfterViewInit(): void {
    this._setupResizeObserver();
  }

  ngOnDestroy(): void {
    window.clearTimeout(this._currentAniTimeout);
    // Clean up resize observer
    if (this._resizeObserver) {
      this._resizeObserver.disconnect();
    }
    this._dragManager.destroy();
  }

  onGridClick(ev: MouseEvent): void {
    if (ev.target instanceof HTMLElement) {
      if (ev.target.classList.contains('col')) {
        this.isCreateTaskActive.set(true);
      }
    }
  }

  @throttle(30)
  onMoveOverGrid(ev: MouseEvent): void {
    if (this.isDragging() || this.isDraggingDelayed()) {
      return;
    }
    if (this.isCreateTaskActive()) {
      return;
    }

    const gridRef = this.gridContainer();
    const gridElement = gridRef?.nativeElement as HTMLElement | undefined;
    if (!gridElement) {
      this.newTaskPlaceholder.set(null);
      return;
    }

    const placeholder = calculatePlaceholderForGridMove({
      event: ev,
      gridElement,
      days: this.daysToShow() || [],
      isTouchPrimary: IS_TOUCH_PRIMARY,
    });

    this.newTaskPlaceholder.set(placeholder);
  }

  @throttle(30)
  dragMoved(ev: CdkDragMove<ScheduleEvent>): void {
    this._dragManager.handleDragMoved(ev);
  }

  dragStarted(ev: CdkDragStart<ScheduleEvent>): void {
    this._dragManager.handleDragStarted(ev);
  }

  dragReleased(ev: CdkDragRelease): void {
    this._dragManager.handleDragReleased(ev);
  }

  @HostListener('document:keydown', ['$event'])
  onDocumentKeyDown(event: KeyboardEvent): void {
    if (event.key === 'Shift') {
      this.isShiftNoScheduleMode.set(true);
      this._dragManager.refreshPreviewForCurrentPointer();
    }
    if (event.key === 'Control' || event.ctrlKey) {
      this.isCtrlPressed.set(true);
    }
  }

  @HostListener('document:keyup', ['$event'])
  onDocumentKeyUp(event: KeyboardEvent): void {
    if (event.key === 'Shift') {
      this.isShiftNoScheduleMode.set(false);
      this._dragManager.refreshPreviewForCurrentPointer();
    }
    if (event.key === 'Control' || !event.ctrlKey) {
      this.isCtrlPressed.set(false);
    }
  }

  private _formatDateLabel(dayStr: string): string {
    if (!dayStr) {
      return '';
    }
    const date = new Date(dayStr);
    if (Number.isNaN(date.getTime())) {
      return dayStr;
    }
    const locale =
      this._dateTimeFormatService.currentLocale ||
      this._translateService.currentLang ||
      this._defaultLocale ||
      'en-US';
    return formatMonthDay(date, locale);
  }

  private _setupResizeObserver(): void {
    const gridContainer = this.gridContainer().nativeElement;
    if (!gridContainer) {
      return;
    }

    // Observe for changes to is-resizing class on schedule-event elements
    this._resizeObserver = new MutationObserver(() => {
      const resizingElements = gridContainer.querySelectorAll(
        'schedule-event.is-resizing',
      );
      this.isAnyEventResizing.set(resizingElements.length > 0);
    });

    // Observe only the grid container instead of entire document for better performance
    this._resizeObserver.observe(gridContainer, {
      subtree: true,
      attributes: true,
      attributeFilter: ['class'],
    });
  }
}
