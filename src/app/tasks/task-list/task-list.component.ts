import { ChangeDetectionStrategy, ChangeDetectorRef, Component, Input, OnDestroy, OnInit, ViewChild } from '@angular/core';
import { Task } from '../task.model';
import { TaskService } from '../task.service';
import { DragulaService } from 'ng2-dragula';
import { Subscription } from 'rxjs';
import { standardListAnimation } from '../../ui/animations/standard-list.ani';

@Component({
  selector: 'task-list',
  templateUrl: './task-list.component.html',
  styleUrls: ['./task-list.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  animations: [standardListAnimation],

})
export class TaskListComponent implements OnDestroy, OnInit {
  @Input() tasks: Task[];
  @Input() filterArgs: string;
  @Input() focusIdList: string[];
  @Input() parentId: string;
  @Input() listId: string;
  @Input() isHideDone: string;
  @Input() listModelId: string;
  @ViewChild('listEl') listEl;
  subs = new Subscription();
  isBlockAni = true;

  private _blockAnimationTimeout: number;

  constructor(
    private _taskService: TaskService,
    private _dragulaService: DragulaService,
    private _cd: ChangeDetectorRef,
  ) {
  }

  ngOnInit() {
    // block initial animation (method could be also used to set an initial animation)
    this._blockAnimation();

    this.subs.add(this._dragulaService.dropModel(this.listId)
      .subscribe((params: any) => {
        const {target, source, targetModel, item} = params;
        if (this.listEl.nativeElement === target) {
          this._blockAnimation();

          const sourceModelId = source.dataset.id;
          const targetModelId = target.dataset.id;
          const targetNewIds = targetModel.map((task) => task.id);
          const movedTaskId = item.id;
          this._taskService.move(movedTaskId, sourceModelId, targetModelId, targetNewIds);
        }
      })
    );
  }

  ngOnDestroy() {
    this.subs.unsubscribe();
    if (this._blockAnimationTimeout) {
      clearTimeout(this._blockAnimationTimeout);
    }
  }

  trackByFn(i: number, task: Task) {
    return task.id;
  }

  private _blockAnimation() {
    this.isBlockAni = true;
    this._cd.detectChanges();
    this._blockAnimationTimeout = window.setTimeout(() => {
      this.isBlockAni = false;
      this._cd.detectChanges();
    });
  }
}
