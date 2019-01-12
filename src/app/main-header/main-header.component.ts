import { Component, ElementRef, Input, OnInit, Renderer2, ViewChild } from '@angular/core';
import { ProjectService } from '../project/project.service';
import { DialogCreateProjectComponent } from '../project/dialogs/create-project/dialog-create-project.component';
import { MatDialog, MatDrawer } from '@angular/material';
import { LayoutService } from '../core/layout/layout.service';
import { BookmarkService } from '../bookmark/bookmark.service';
import { NoteService } from '../note/note.service';
import { TaskService } from '../tasks/task.service';
import { ConfigService } from '../config/config.service';
import { PomodoroService } from '../pomodoro/pomodoro.service';

@Component({
  selector: 'main-header',
  templateUrl: './main-header.component.html',
  styleUrls: ['./main-header.component.scss']
})
export class MainHeaderComponent implements OnInit {
  progressCircleRadius = 13;
  circumference = this.progressCircleRadius * Math.PI * 2;

  @Input() drawer: MatDrawer;
  @ViewChild('circleSvg') circleSvg: ElementRef;

  constructor(
    public readonly projectService: ProjectService,
    public readonly bookmarkService: BookmarkService,
    public readonly noteService: NoteService,
    public readonly taskService: TaskService,
    public readonly configService: ConfigService,
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
}
