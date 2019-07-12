import {ChangeDetectionStrategy, Component, ElementRef, Input, OnInit, Renderer2, ViewChild} from '@angular/core';
import {ProjectService} from '../../features/project/project.service';
import {DialogCreateProjectComponent} from '../../features/project/dialogs/create-project/dialog-create-project.component';
import {MatDialog} from '@angular/material/dialog';
import {MatDrawer} from '@angular/material/sidenav';
import {LayoutService} from '../layout/layout.service';
import {BookmarkService} from '../../features/bookmark/bookmark.service';
import {NoteService} from '../../features/note/note.service';
import {TaskService} from '../../features/tasks/task.service';
import {GlobalConfigService} from '../../features/config/global-config.service';
import {PomodoroService} from '../../features/pomodoro/pomodoro.service';
import {Project} from '../../features/project/project.model';
import {T} from '../../t.const';

@Component({
  selector: 'main-header',
  templateUrl: './main-header.component.html',
  styleUrls: ['./main-header.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class MainHeaderComponent implements OnInit {
  T = T;
  progressCircleRadius = 13;
  circumference = this.progressCircleRadius * Math.PI * 2;
  isProjectMenuDisabled = false;
  isMainMenuDisabled = false;

  @Input() drawer: MatDrawer;
  @ViewChild('circleSvg', {static: true}) circleSvg: ElementRef;

  constructor(
    public readonly projectService: ProjectService,
    public readonly bookmarkService: BookmarkService,
    public readonly noteService: NoteService,
    public readonly taskService: TaskService,
    public readonly configService: GlobalConfigService,
    public readonly pomodoroService: PomodoroService,
    private readonly _matDialog: MatDialog,
    private readonly _layoutService: LayoutService,
    private readonly _renderer: Renderer2,
  ) {
  }

  ngOnInit() {
    this.taskService.currentTaskProgress$.subscribe((progress_) => {
      let progress = progress_ || 1;
      if (progress > 1) {
        progress = 1;
      }
      const dashOffset = this.circumference * -1 * progress;
      this._renderer.setStyle(this.circleSvg.nativeElement, 'stroke-dashoffset', dashOffset);
    });
  }

  trackById(i: number, project: Project) {
    return project.id;
  }

  switchProject(projectId) {
    this.projectService.setCurrentId(projectId);
  }

  addProject() {
    this._matDialog.open(DialogCreateProjectComponent, {
      restoreFocus: true,
    });
  }

  showAddTaskBar() {
    this._layoutService.showAddTaskBar();
  }

  toggleShowNotes() {
    this.noteService.toggleShow();
  }

  togglePlay() {
    this.taskService.toggleStartTask();
  }

  skipToNextPomodoroSession() {
    this.pomodoroService.finishPomodoroSession();
  }

  stopPomodoro() {
    this.pomodoroService.stop();
  }
}
