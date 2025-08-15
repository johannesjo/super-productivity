import {
  ChangeDetectionStrategy,
  Component,
  computed,
  ElementRef,
  inject,
  input,
  OnDestroy,
  OnInit,
  signal,
  viewChild,
} from '@angular/core';
import { ScheduleEvent } from '../schedule.model';
import {
  CdkDrag,
  CdkDragMove,
  CdkDragRelease,
  CdkDragStart,
} from '@angular/cdk/drag-drop';
import { Store } from '@ngrx/store';
import { PlannerActions } from '../../planner/store/planner.actions';
import { FH, SVEType, T_ID_PREFIX } from '../schedule.const';
import { throttle } from '../../../util/decorators';
import { CreateTaskPlaceholderComponent } from '../create-task-placeholder/create-task-placeholder.component';
import { ScheduleEventComponent } from '../schedule-event/schedule-event.component';
import { TranslatePipe } from '@ngx-translate/core';
import { MatIcon } from '@angular/material/icon';
import { T } from '../../../t.const';
import { IS_TOUCH_PRIMARY } from '../../../util/is-mouse-primary';
import { DRAG_DELAY_FOR_TOUCH } from '../../../app.constants';
import { MatTooltip } from '@angular/material/tooltip';
import { Log } from '../../../core/log';
import { DateTimeFormatService } from '../../../core/date-time-format/date-time-format.service';

const D_HOURS = 24;
const DRAG_CLONE_CLASS = 'drag-clone';
const DRAG_OVER_CLASS = 'drag-over';
const IS_DRAGGING_CLASS = 'is-dragging';
const IS_NOT_DRAGGING_CLASS = 'is-not-dragging';

@Component({
  selector: 'schedule-week',
  imports: [
    ScheduleEventComponent,
    CdkDrag,
    CreateTaskPlaceholderComponent,
    MatIcon,
    TranslatePipe,
    MatTooltip,
  ],
  templateUrl: './schedule-week.component.html',
  styleUrl: './schedule-week.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
  standalone: true,
})
export class ScheduleWeekComponent implements OnInit, OnDestroy {
  private _store = inject(Store);
  private _dateTimeFormatService = inject(DateTimeFormatService);

  events = input<ScheduleEvent[] | null>([]);
  beyondBudget = input<ScheduleEvent[][] | null>([]);
  daysToShow = input<string[]>([]);
  workStartEnd = input<{ workStartRow: number; workEndRow: number } | null>(null);
  currentTimeRow = input<number>(0);
  isCtrlPressed = input<boolean>(false);

  FH = FH;
  IS_TOUCH_PRIMARY = IS_TOUCH_PRIMARY;
  DRAG_DELAY_FOR_TOUCH = DRAG_DELAY_FOR_TOUCH;
  SVEType: typeof SVEType = SVEType;
  T: typeof T = T;

  rowsByNr = Array.from({ length: D_HOURS * FH }, (_, index) => index).filter(
    (_, index) => index % FH === 0,
  );

  times = computed(() => {
    const is12Hour = !this._dateTimeFormatService.is24HourFormat;
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
  containerExtraClass = signal(IS_NOT_DRAGGING_CLASS);
  prevDragOverEl = signal<HTMLElement | null>(null);
  dragCloneEl = signal<HTMLElement | null>(null);

  readonly gridContainer = viewChild.required<ElementRef>('gridContainer');

  private _currentAniTimeout: number | undefined;

  ngOnInit(): void {
    const workStartEnd = this.workStartEnd();
    this.endOfDayColRowStart.set(workStartEnd?.workStartRow || D_HOURS * 0.5 * FH);
  }

  ngOnDestroy(): void {
    window.clearTimeout(this._currentAniTimeout);
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

    if (ev.target instanceof HTMLElement && ev.target.classList.contains('col')) {
      const gridContainer = this.gridContainer().nativeElement;
      const gridStyles = window.getComputedStyle(gridContainer);

      const rowSizes = gridStyles.gridTemplateRows
        .split(' ')
        .map((size) => parseFloat(size));

      let rowIndex = 0;
      let yOffset = ev.offsetY;

      for (let i = 0; i < rowSizes.length; i++) {
        if (yOffset < rowSizes[i]) {
          rowIndex = i + 1;
          break;
        }
        yOffset -= rowSizes[i];
      }

      const targetColRowOffset = +ev.target.style.gridRowStart - 2;
      const targetColColOffset = +ev.target.style.gridColumnStart;

      // for mobile, we use blocks of 15 minutes
      // eslint-disable-next-line no-mixed-operators
      const targetRow = IS_TOUCH_PRIMARY ? Math.floor(rowIndex / 3) * 3 - 1 : rowIndex;
      const row = targetRow + targetColRowOffset;
      const hours = Math.floor((row - 1) / FH);
      const minutes = Math.floor(((row - 1) % FH) * (60 / FH));
      const time = `${hours}:${minutes.toString().padStart(2, '0')}`;

      this.newTaskPlaceholder.set({
        style: `grid-row: ${row} / span 6; grid-column: ${targetColColOffset} / span 1`,
        time,
        date: this.daysToShow()[targetColColOffset - 2],
      });
    } else {
      this.newTaskPlaceholder.set(null);
    }
  }

  @throttle(30)
  dragMoved(ev: CdkDragMove<ScheduleEvent>): void {
    if (!this.isDragging()) {
      return;
    }

    ev.source.element.nativeElement.style.pointerEvents = 'none';
    const targetEl = document.elementFromPoint(
      ev.pointerPosition.x,
      ev.pointerPosition.y,
    ) as HTMLElement;
    if (!targetEl) {
      return;
    }
    if (targetEl.classList.contains(DRAG_CLONE_CLASS)) {
      return;
    }

    const prevEl = this.prevDragOverEl();
    if (targetEl !== prevEl) {
      Log.log('dragMoved targetElChanged', targetEl);

      if (prevEl) {
        prevEl.classList.remove(DRAG_OVER_CLASS);
      }
      this.prevDragOverEl.set(targetEl);

      if (
        targetEl.classList.contains(SVEType.Task) ||
        targetEl.classList.contains(SVEType.SplitTask) ||
        targetEl.classList.contains(SVEType.SplitTaskPlannedForDay) ||
        targetEl.classList.contains(SVEType.TaskPlannedForDay)
      ) {
        targetEl.classList.add(DRAG_OVER_CLASS);
      } else if (targetEl.classList.contains('col')) {
        targetEl.classList.add(DRAG_OVER_CLASS);
      }
    }
  }

  dragStarted(ev: CdkDragStart<ScheduleEvent>): void {
    Log.log('dragStart', ev);
    this.isDragging.set(true);
    this.isDraggingDelayed.set(true);
    this.containerExtraClass.set(IS_DRAGGING_CLASS + '  ' + ev.source.data.type);

    const cur = ev.source.element.nativeElement;
    const cloneEl = this.dragCloneEl();
    if (cloneEl) {
      cloneEl.remove();
    }
    const newCloneEl = cur.cloneNode(true) as HTMLElement;
    newCloneEl.style.transform = 'translateY(0)';
    newCloneEl.style.opacity = '.1';
    newCloneEl.classList.add(DRAG_CLONE_CLASS);
    cur.parentNode?.insertBefore(newCloneEl, cur);
    this.dragCloneEl.set(newCloneEl);
  }

  dragReleased(ev: CdkDragRelease): void {
    const prevEl = this.prevDragOverEl();
    Log.log('dragReleased', {
      target: ev.event.target,
      source: ev.source.element.nativeElement,
      ev,
      dragOverEl: prevEl,
    });

    const target = (prevEl || ev.event.target) as HTMLElement;
    if (prevEl) {
      prevEl.classList.remove(DRAG_OVER_CLASS);
      this.prevDragOverEl.set(null);
    }
    const cloneEl = this.dragCloneEl();
    if (cloneEl) {
      cloneEl.remove();
    }

    this.isDragging.set(false);
    ev.source.element.nativeElement.style.pointerEvents = '';
    ev.source.element.nativeElement.style.opacity = '0';

    setTimeout(() => {
      if (ev.source.element?.nativeElement?.style) {
        ev.source.element.nativeElement.style.opacity = '';
        ev.source.element.nativeElement.style.pointerEvents = '';
      }
      this.isDraggingDelayed.set(false);
    }, 100);

    this.containerExtraClass.set(IS_NOT_DRAGGING_CLASS);

    if (target.tagName.toLowerCase() === 'div' && target.classList.contains('col')) {
      const isMoveToEndOfDay = target.classList.contains('end-of-day');
      const targetDay = (target as any).day || target.getAttribute('data-day');
      Log.log({ targetDay });
      if (targetDay) {
        this._store.dispatch(
          PlannerActions.planTaskForDay({
            task: ev.source.data.data,
            day: targetDay,
            isAddToTop: !isMoveToEndOfDay,
          }),
        );
      }
    } else if (target.tagName.toLowerCase() === 'schedule-event') {
      const sourceTaskId = ev.source.element.nativeElement.id.replace(T_ID_PREFIX, '');
      const targetTaskId = target.id.replace(T_ID_PREFIX, '');
      Log.log(sourceTaskId === targetTaskId, sourceTaskId, targetTaskId);

      if (
        sourceTaskId &&
        sourceTaskId.length > 0 &&
        targetTaskId &&
        sourceTaskId !== targetTaskId
      ) {
        Log.log('sourceTaskId', sourceTaskId, 'targetTaskId', targetTaskId);
        this._store.dispatch(
          PlannerActions.moveBeforeTask({
            fromTask: ev.source.data.data,
            toTaskId: targetTaskId,
          }),
        );
      }
    }

    ev.source.element.nativeElement.style.transform = 'translate3d(0, 0, 0)';
    ev.source.reset();
  }
}
