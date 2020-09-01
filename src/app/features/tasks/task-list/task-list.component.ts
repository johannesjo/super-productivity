import {
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  Component,
  ElementRef,
  Input,
  OnDestroy,
  OnInit,
  ViewChild
} from '@angular/core';
import { Task, TaskWithSubTasks } from '../task.model';
import { TaskService } from '../task.service';
import { DragulaService } from 'ng2-dragula';
import { BehaviorSubject, combineLatest, Observable, ReplaySubject, Subscription } from 'rxjs';
import { standardListAnimation } from '../../../ui/animations/standard-list.ani';
import { expandFadeFastAnimation } from '../../../ui/animations/expand.ani';
import { map } from 'rxjs/operators';
import { filterDoneTasks } from '../filter-done-tasks.pipe';
import { T } from '../../../t.const';

@Component({
  selector: 'task-list',
  templateUrl: './task-list.component.html',
  styleUrls: ['./task-list.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  animations: [standardListAnimation, expandFadeFastAnimation],

})
export class TaskListComponent implements OnDestroy, OnInit {
  T: typeof T = T;
  tasksIN: TaskWithSubTasks[] = [];
  tasks$: ReplaySubject<TaskWithSubTasks[]> = new ReplaySubject(1);
  isHideDoneIN: boolean = false;
  isHideDone$: BehaviorSubject<boolean> = new BehaviorSubject<boolean>(false);
  isHideAllIN: boolean = false;
  isHideAll$: BehaviorSubject<boolean> = new BehaviorSubject<boolean>(false);
  filteredTasks: TaskWithSubTasks[] = [];

  @Input() parentId?: string;
  @Input() listModelId?: string;
  @Input() noTasksMsg?: string;
  @Input() isBacklog: boolean = false;
  listId?: string;
  @ViewChild('listEl', {static: true}) listEl?: ElementRef;
  isBlockAni: boolean = false;
  doneTasksLength: number = 0;
  undoneTasksLength: number = 0;
  allTasksLength: number = 0;
  currentTaskId: string | null = null;
  private _subs: Subscription = new Subscription();
  private _blockAnimationTimeout?: number;
  private _filteredTasks$: Observable<TaskWithSubTasks[]> = combineLatest([
    this.tasks$,
    this.isHideDone$,
    this.isHideAll$,
    this._taskService.currentTaskId$,
  ]).pipe(
    map(([tasks, isHideDone, isHideAll, currentId]) =>
      filterDoneTasks(tasks, currentId, isHideDone, isHideAll)
    ),
  );

  constructor(
    private _taskService: TaskService,
    private _dragulaService: DragulaService,
    private _cd: ChangeDetectorRef,
  ) {
  }

  @Input('listId') set listIdIn(v: string) {
    this.listId = v;

    // Disable filtering for non sub task tasks
    if (v !== 'SUB') {
      this._filteredTasks$ = this.tasks$;
    }
  }

  @Input() set tasks(tasks: TaskWithSubTasks[]) {
    this.tasksIN = tasks;
    this.tasks$.next(tasks);

    if (!tasks) {
      return;
    }
    this.doneTasksLength = this.tasksIN.filter(task => task.isDone).length;
    this.allTasksLength = this.tasksIN.length;
    this.undoneTasksLength = this.tasksIN.length - this.doneTasksLength;
  }

  @Input() set isHideDone(val: boolean) {
    this.isHideDoneIN = val;
    this.isHideDone$.next(val);
  }

  @Input() set isHideAll(val: boolean) {
    this.isHideAllIN = val;
    this.isHideAll$.next(val);
  }

  ngOnInit() {
    this._subs.add(this._filteredTasks$.subscribe((tasks) => {
      this.filteredTasks = tasks;
    }));

    this._subs.add(this._dragulaService.dropModel(this.listId)
      .subscribe((params: any) => {
        const {target, source, targetModel, item} = params;
        if (this.listEl && this.listEl.nativeElement === target) {
          this._blockAnimation();

          const sourceModelId = source.dataset.id;
          const targetModelId = target.dataset.id;
          const targetNewIds = targetModel.map((task: Task) => task.id);
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
    if (!this.parentId) {
      throw new Error();
    }

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
