import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  ElementRef,
  inject,
  Input,
  LOCALE_ID,
  OnDestroy,
  OnInit,
  viewChild,
} from '@angular/core';
import { BehaviorSubject } from 'rxjs';
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
import { throttle } from 'helpful-decorators';
import { CreateTaskPlaceholderComponent } from '../create-task-placeholder/create-task-placeholder.component';
import { ScheduleEventComponent } from '../schedule-event/schedule-event.component';
import { AsyncPipe } from '@angular/common';
import { TranslatePipe } from '@ngx-translate/core';
import { MatIcon } from '@angular/material/icon';
import { T } from '../../../t.const';
import { IS_TOUCH_PRIMARY } from '../../../util/is-mouse-primary';
import { DRAG_DELAY_FOR_TOUCH } from '../../../app.constants';
import { MatTooltip } from '@angular/material/tooltip';
import { ShortcutService } from '../../../core-ui/shortcut/shortcut.service';

const D_HOURS = 24;
const DRAG_CLONE_CLASS = 'drag-clone';
const DRAG_OVER_CLASS = 'drag-over';
const IS_DRAGGING_CLASS = 'is-dragging';
const IS_NOT_DRAGGING_CLASS = 'is-not-dragging';

@Component({
  selector: 'schedule-week',
  imports: [
    AsyncPipe,
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
  shortcutService = inject(ShortcutService);
  private locale = inject(LOCALE_ID);
  destroyRef = inject(DestroyRef);

  @Input() events: ScheduleEvent[] | null = [];
  @Input() beyondBudget: ScheduleEvent[][] | null = [];
  @Input() daysToShow: string[] = [];
  @Input() workStartEnd: { workStartRow: number; workEndRow: number } | null = null;
  @Input() currentTimeRow: number = 0;
  @Input() isCtrlPressed: boolean = false;

  FH = FH;
  IS_TOUCH_PRIMARY = IS_TOUCH_PRIMARY;
  DRAG_DELAY_FOR_TOUCH = DRAG_DELAY_FOR_TOUCH;
  SVEType: typeof SVEType = SVEType;
  T: typeof T = T;

  rowsByNr = Array.from({ length: D_HOURS * FH }, (_, index) => index).filter(
    (v, index) => index % FH === 0,
  );

  is12HourFormat = Intl.DateTimeFormat(this.locale, { hour: 'numeric' }).resolvedOptions()
    .hour12;

  times: string[] = this.rowsByNr.map((rowVal, index) => {
    return this.is12HourFormat
      ? index >= 13
        ? (index - 12).toString() + ':00 PM'
        : index.toString() + ':00 AM'
      : index.toString() + ':00';
  });

  endOfDayColRowStart: number = D_HOURS * 0.5 * FH;
  totalRows: number = D_HOURS * FH;

  get safeEvents(): ScheduleEvent[] {
    return this.events || [];
  }

  get safeBeyondBudget(): ScheduleEvent[][] {
    return this.beyondBudget || [];
  }

  newTaskPlaceholder$ = new BehaviorSubject<{
    style: string;
    time: string;
    date: string;
  } | null>(null);

  isDragging = false;
  isDraggingDelayed = false;
  isCreateTaskActive = false;
  containerExtraClass = IS_NOT_DRAGGING_CLASS;
  prevDragOverEl: HTMLElement | null = null;
  dragCloneEl: HTMLElement | null = null;

  readonly gridContainer = viewChild.required<ElementRef>('gridContainer');

  private _currentAniTimeout: number | undefined;

  ngOnInit(): void {
    this.endOfDayColRowStart = this.workStartEnd?.workStartRow || D_HOURS * 0.5 * FH;
  }

  ngOnDestroy(): void {
    window.clearTimeout(this._currentAniTimeout);
  }

  onGridClick(ev: MouseEvent): void {
    if (ev.target instanceof HTMLElement) {
      if (ev.target.classList.contains('col')) {
        this.isCreateTaskActive = true;
      }
    }
  }

  @throttle(30)
  onMoveOverGrid(ev: MouseEvent): void {
    if (this.isDragging || this.isDraggingDelayed) {
      return;
    }
    if (this.isCreateTaskActive) {
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

      this.newTaskPlaceholder$.next({
        style: `grid-row: ${row} / span 6; grid-column: ${targetColColOffset} / span 1`,
        time,
        date: this.daysToShow[targetColColOffset - 2],
      });
    } else {
      this.newTaskPlaceholder$.next(null);
    }
  }

  @throttle(30)
  dragMoved(ev: CdkDragMove<ScheduleEvent>): void {
    if (!this.isDragging) {
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

    if (targetEl !== this.prevDragOverEl) {
      console.log('dragMoved targetElChanged', targetEl);

      if (this.prevDragOverEl) {
        this.prevDragOverEl.classList.remove(DRAG_OVER_CLASS);
      }
      this.prevDragOverEl = targetEl;

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
    console.log('dragStart', ev);
    this.isDragging = this.isDraggingDelayed = true;
    this.containerExtraClass = IS_DRAGGING_CLASS + '  ' + ev.source.data.type;

    const cur = ev.source.element.nativeElement;
    if (this.dragCloneEl) {
      this.dragCloneEl.remove();
    }
    this.dragCloneEl = cur.cloneNode(true) as HTMLElement;
    this.dragCloneEl.style.transform = 'translateY(0)';
    this.dragCloneEl.style.opacity = '.1';
    this.dragCloneEl.classList.add(DRAG_CLONE_CLASS);
    cur.parentNode?.insertBefore(this.dragCloneEl, cur);
  }

  dragReleased(ev: CdkDragRelease): void {
    console.log('dragReleased', {
      target: ev.event.target,
      source: ev.source.element.nativeElement,
      ev,
      dragOverEl: this.prevDragOverEl,
    });

    const target = (this.prevDragOverEl || ev.event.target) as HTMLElement;
    if (this.prevDragOverEl) {
      this.prevDragOverEl.classList.remove(DRAG_OVER_CLASS);
      this.prevDragOverEl = null;
    }
    if (this.dragCloneEl) {
      this.dragCloneEl.remove();
    }

    this.isDragging = false;
    ev.source.element.nativeElement.style.pointerEvents = '';
    ev.source.element.nativeElement.style.opacity = '0';

    setTimeout(() => {
      if (ev.source.element?.nativeElement?.style) {
        ev.source.element.nativeElement.style.opacity = '';
        ev.source.element.nativeElement.style.pointerEvents = '';
      }
      this.isDraggingDelayed = false;
    }, 100);

    this.containerExtraClass = IS_NOT_DRAGGING_CLASS;

    if (target.tagName.toLowerCase() === 'div' && target.classList.contains('col')) {
      const isMoveToEndOfDay = target.classList.contains('end-of-day');
      const targetDay = (target as any).day || target.getAttribute('data-day');
      console.log({ targetDay });
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
      console.log(sourceTaskId === targetTaskId, sourceTaskId, targetTaskId);

      if (
        sourceTaskId &&
        sourceTaskId.length > 0 &&
        targetTaskId &&
        sourceTaskId !== targetTaskId
      ) {
        console.log('sourceTaskId', sourceTaskId, 'targetTaskId', targetTaskId);
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
