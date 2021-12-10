import {
  ChangeDetectionStrategy,
  Component,
  EventEmitter,
  Input,
  OnInit,
  Output,
} from '@angular/core';
import { Task } from '../../../tasks/task.model';
import { selectIdleTime } from '../../store/idle.selectors';
import { Store } from '@ngrx/store';
import { SimpleCounterService } from '../../../simple-counter/simple-counter.service';
import { first } from 'rxjs/operators';
import { T } from 'src/app/t.const';
import { SimpleCounterIdleBtn } from '../dialog-idle.model';
import { dirtyDeepCopy } from '../../../../util/dirtyDeepCopy';

interface TrackToItem {
  type: 'BREAK' | 'TASK' | 'TASK_BREAK';
  time: number;
  simpleCounterToggleBtns: SimpleCounterIdleBtn[];
  task?: Task;
  title?: string;
}

@Component({
  selector: 'idle-split-mode',
  templateUrl: './idle-split-mode.component.html',
  styleUrls: ['./idle-split-mode.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class IdleSplitModeComponent implements OnInit {
  T: typeof T = T;

  @Input() simpleCounterToggleBtns: SimpleCounterIdleBtn[] = [];
  @Input() prevSelectedTask: Task | null = null;

  idleTime$ = this._store.select(selectIdleTime);
  trackToItems: TrackToItem[] = [];

  @Output() cancel = new EventEmitter();
  @Output() save = new EventEmitter();

  constructor(
    private _store: Store,
    private _simpleCounterService: SimpleCounterService,
  ) {}

  ngOnInit(): void {
    this.trackToItems = this.prevSelectedTask
      ? [
          {
            type: 'TASK',
            time: 0,
            task: this.prevSelectedTask,
            simpleCounterToggleBtns: dirtyDeepCopy(this.simpleCounterToggleBtns),
          },
          {
            type: 'TASK',
            time: 0,
            title: '',
            simpleCounterToggleBtns: dirtyDeepCopy(this.simpleCounterToggleBtns),
          },
        ]
      : [
          {
            type: 'TASK',
            time: 0,
            title: '',
            simpleCounterToggleBtns: dirtyDeepCopy(this.simpleCounterToggleBtns),
          },
          {
            type: 'TASK',
            time: 0,
            title: '',
            simpleCounterToggleBtns: dirtyDeepCopy(this.simpleCounterToggleBtns),
          },
        ];
  }

  onTaskChange(item: TrackToItem, taskOrTaskTitle: Task | string): void {
    const isCreate = typeof taskOrTaskTitle === 'string';
    if (isCreate) {
      item.title = taskOrTaskTitle as string;
      item.task = undefined;
    } else {
      item.task = taskOrTaskTitle as Task;
      item.title = undefined;
    }
  }

  addTrackingItem(): void {
    this.trackToItems.push({
      type: 'TASK',
      time: 0,
      title: '',
      simpleCounterToggleBtns: dirtyDeepCopy(this.simpleCounterToggleBtns),
    });
  }

  saveI(): void {
    this.save.emit();
  }

  cancelI(): void {
    this.cancel.emit();
  }

  private async _updateSimpleCounterValues(): Promise<void> {
    const idleTime = await this.idleTime$.pipe(first()).toPromise();

    this.simpleCounterToggleBtns.forEach((tglBtn) => {
      if (tglBtn.isTrackTo) {
        this._simpleCounterService.increaseCounterToday(tglBtn.id, idleTime);
        if (tglBtn.isWasEnabledBefore) {
          this._simpleCounterService.toggleCounter(tglBtn.id);
        }
      }
    });
  }
}
