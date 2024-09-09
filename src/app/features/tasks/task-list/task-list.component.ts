import {
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  Component,
  computed,
  ElementRef,
  input,
  OnDestroy,
  OnInit,
  ViewChild,
} from '@angular/core';
import { Task, TaskWithSubTasks } from '../task.model';
import { TaskService } from '../task.service';
import { expandFadeFastAnimation } from '../../../ui/animations/expand.ani';
import { filterDoneTasks } from '../filter-done-tasks.pipe';
import { T } from '../../../t.const';
import { taskListAnimation } from './task-list-ani';
import { toSignal } from '@angular/core/rxjs-interop';
import { DragulaService } from 'ng2-dragula';
import { Subscription } from 'rxjs';

@Component({
  selector: 'task-list',
  templateUrl: './task-list.component.html',
  styleUrls: ['./task-list.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  animations: [taskListAnimation, expandFadeFastAnimation],
})
export class TaskListComponent implements OnDestroy, OnInit {
  tasks = input<TaskWithSubTasks[]>([]);
  isHideDone = input(false);
  isHideAll = input(false);

  listId = input<'PARENT' | 'SUB' | undefined>(undefined);
  listModelId = input<string | undefined>(undefined);
  parentId = input<string | undefined>(undefined);

  noTasksMsg = input<string | undefined>(undefined);
  isBacklog = input(false);
  isSubTaskList = input(false);

  currentTaskId = toSignal(this._taskService.currentTaskId$);

  filteredTasks = computed<Task[]>(() => {
    const tasks = this.tasks();
    if (this.listId() === 'PARENT') {
      return tasks;
    }
    const isHideDone = this.isHideDone();
    const isHideAll = this.isHideAll();
    const currentId = this.currentTaskId() || null;
    return filterDoneTasks(tasks, currentId, isHideDone, isHideAll);
  });

  doneTasksLength = computed(() => {
    return this.tasks()?.filter((task) => task.isDone).length ?? 0;
  });
  allTasksLength = computed(() => this.tasks()?.length ?? 0);

  @ViewChild('listEl', { static: true }) listEl?: ElementRef;

  T: typeof T = T;

  isBlockAni: boolean = false;
  private _subs: Subscription = new Subscription();

  private _blockAnimationTimeout?: number;

  constructor(
    private _taskService: TaskService,
    private _dragulaService: DragulaService,
    private _cd: ChangeDetectorRef,
  ) {}

  ngOnInit(): void {
    this._subs.add(
      this._dragulaService.dropModel(this.listId()).subscribe((params: any) => {
        const { target, source, targetModel, item } = params;
        if (this.listEl && this.listEl.nativeElement === target) {
          this._blockAnimation();

          const sourceModelId = source.dataset.id;
          const targetModelId = target.dataset.id;
          const targetNewIds = targetModel.map((task: Task) => task.id);
          const movedTaskId = item.id;
          this._taskService.move(movedTaskId, sourceModelId, targetModelId, targetNewIds);
        }
      }),
    );
  }
  ngOnDestroy(): void {
    if (this._blockAnimationTimeout) {
      clearTimeout(this._blockAnimationTimeout);
    }
  }

  trackByFn(i: number, task: Task): string {
    return task.id;
  }

  expandDoneTasks(): void {
    const pid = this.parentId();
    if (!pid) {
      throw new Error('Parent ID is undefined');
    }

    this._taskService.showSubTasks(pid);
    this._taskService.focusTask(pid);
  }

  // TODO after drop
  private _blockAnimation(): void {
    this.isBlockAni = true;
    this._cd.detectChanges();
    this._blockAnimationTimeout = window.setTimeout(() => {
      this.isBlockAni = false;
      this._cd.detectChanges();
    });
  }
}
