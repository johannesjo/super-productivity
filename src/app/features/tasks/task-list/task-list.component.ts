import {
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  Component,
  Input,
  OnDestroy,
  OnInit,
  ViewChild
} from '@angular/core';
import {Task, TaskWithSubTasks} from '../task.model';
import {TaskService} from '../task.service';
import {DragulaService} from 'ng2-dragula';
import {BehaviorSubject, combineLatest, Observable, Subscription} from 'rxjs';
import {standardListAnimation} from '../../../ui/animations/standard-list.ani';
import {expandFadeFastAnimation} from '../../../ui/animations/expand.ani';
import {map} from 'rxjs/operators';
import {filterDoneTasks} from '../filter-done-tasks.pipe';

@Component({
  selector: 'task-list',
  templateUrl: './task-list.component.html',
  styleUrls: ['./task-list.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  animations: [standardListAnimation, expandFadeFastAnimation],

})
export class TaskListComponent implements OnDestroy, OnInit {
  tasks_: TaskWithSubTasks[];
  tasks$: BehaviorSubject<TaskWithSubTasks[]> = new BehaviorSubject([]);
  isHideDone_: boolean;
  isHideDone$: BehaviorSubject<boolean> = new BehaviorSubject(false);
  isHideAll_: boolean;
  isHideAll$: BehaviorSubject<boolean> = new BehaviorSubject(false);
  filteredTasks$: Observable<TaskWithSubTasks[]> = combineLatest(
    this.tasks$,
    this.isHideDone$,
    this.isHideAll$,
    this._taskService.currentTaskId$,
  ).pipe(map(([tasks, isHideDone, isHideAll, currentId]) =>
    filterDoneTasks(tasks, currentId, isHideDone, isHideAll)
  ));
  @Input() parentId: string;
  @Input() listId: string;
  @Input() listModelId: string;
  @Input() noTasksMsg: string;
  @ViewChild('listEl', {static: true}) listEl;
  isBlockAni = true;
  doneTasksLength = 0;
  undoneTasksLength = 0;
  allTasksLength = 0;
  currentTaskId: string;

  private _subs = new Subscription();
  private _blockAnimationTimeout: number;

  constructor(
    private _taskService: TaskService,
    private _dragulaService: DragulaService,
    private _cd: ChangeDetectorRef,
  ) {
  }

  @Input() set tasks(tasks: TaskWithSubTasks[]) {
    this.tasks_ = tasks;
    this.tasks$.next(tasks);
    this.doneTasksLength = this.tasks_.filter(task => task.isDone).length;
    this.allTasksLength = this.tasks_.length;
    this.undoneTasksLength = this.tasks_.length - this.doneTasksLength;
  }

  @Input() set isHideDone(val: boolean) {
    this.isHideDone_ = val;
    this.isHideDone$.next(val);
  }

  @Input() set isHideAll(val: boolean) {
    this.isHideAll_ = val;
    this.isHideAll$.next(val);
  }

  ngOnInit() {
    // block initial animation (method could be also used to set an initial animation)
    this._blockAnimation();

    this._subs.add(this._dragulaService.dropModel(this.listId)
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

    this._subs.add(this._taskService.currentTaskId$.subscribe(val => this.currentTaskId = val));
  }

  ngOnDestroy() {
    this._subs.unsubscribe();
    if (this._blockAnimationTimeout) {
      clearTimeout(this._blockAnimationTimeout);
    }
  }

  trackByFn(i: number, task: Task) {
    return task.id;
  }

  expandDoneTasks() {
    this._taskService.showSubTasks(this.parentId);
    this._taskService.focusTask(this.parentId);
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
