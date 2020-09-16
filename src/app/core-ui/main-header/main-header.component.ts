import { ChangeDetectionStrategy, Component, ElementRef, OnDestroy, OnInit, Renderer2, ViewChild } from '@angular/core';
import { ProjectService } from '../../features/project/project.service';
import { LayoutService } from '../layout/layout.service';
import { BookmarkService } from '../../features/bookmark/bookmark.service';
import { TaskService } from '../../features/tasks/task.service';
import { PomodoroService } from '../../features/pomodoro/pomodoro.service';
import { T } from '../../t.const';
import { fadeAnimation } from '../../ui/animations/fade.ani';
import { filter, first, switchMap } from 'rxjs/operators';
import { Observable, of, Subscription } from 'rxjs';
import { WorkContextService } from '../../features/work-context/work-context.service';
import { TagService } from '../../features/tag/tag.service';
import { Tag } from '../../features/tag/tag.model';
import { Project } from '../../features/project/project.model';
import { expandFadeHorizontalAnimation } from '../../ui/animations/expand.ani';
import { SimpleCounterService } from '../../features/simple-counter/simple-counter.service';
import { SimpleCounter } from '../../features/simple-counter/simple-counter.model';

@Component({
  selector: 'main-header',
  templateUrl: './main-header.component.html',
  styleUrls: ['./main-header.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  animations: [fadeAnimation, expandFadeHorizontalAnimation]
})
export class MainHeaderComponent implements OnInit, OnDestroy {
  T: typeof T = T;
  progressCircleRadius: number = 10;
  circumference: number = this.progressCircleRadius * Math.PI * 2;

  @ViewChild('circleSvg', {static: true}) circleSvg?: ElementRef;

  currentTaskContext$: Observable<Project | Tag | null> = this.taskService.currentTaskParentOrCurrent$.pipe(
    filter(ct => !!ct),
    switchMap((currentTask) => this.workContextService.activeWorkContextId$.pipe(
      filter((activeWorkContextId) => !!activeWorkContextId),
      switchMap((activeWorkContextId) => {
        if (currentTask.projectId === activeWorkContextId || currentTask.tagIds.includes(activeWorkContextId as string)) {
          return of(null);
        }
        return currentTask.projectId
          ? this.projectService.getByIdOnce$(currentTask.projectId)
          : this._tagService.getTagById$(currentTask.tagIds[0]).pipe(first());
      }),
    )),
  );

  private _subs: Subscription = new Subscription();

  constructor(
    public readonly projectService: ProjectService,
    public readonly workContextService: WorkContextService,
    public readonly bookmarkService: BookmarkService,
    public readonly taskService: TaskService,
    public readonly pomodoroService: PomodoroService,
    public readonly layoutService: LayoutService,
    public readonly simpleCounterService: SimpleCounterService,
    private readonly _tagService: TagService,
    private readonly _renderer: Renderer2,
  ) {
  }

  ngOnDestroy(): void {
    this._subs.unsubscribe();
  }

  ngOnInit() {
    this.taskService.currentTaskProgress$.subscribe((progressIN) => {
      if (this.circleSvg) {
        let progress = progressIN || 1;
        if (progress > 1) {
          progress = 1;
        }
        const dashOffset = this.circumference * -1 * progress;
        this._renderer.setStyle(this.circleSvg.nativeElement, 'stroke-dashoffset', dashOffset);
      }
    });
  }

  trackById(i: number, item: SimpleCounter) {
    return item.id;
  }
}
