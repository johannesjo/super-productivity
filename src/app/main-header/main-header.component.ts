import { Component, Input, OnInit } from '@angular/core';
import { ProjectService } from '../project/project.service';
import { DialogCreateProjectComponent } from '../project/dialogs/create-project/dialog-create-project.component';
import { MatDialog, MatDrawer } from '@angular/material';
import { LayoutService } from '../core/layout/layout.service';
import { BookmarkService } from '../bookmark/bookmark.service';
import { NoteService } from '../note/note.service';
import { TaskService } from '../tasks/task.service';

@Component({
  selector: 'main-header',
  templateUrl: './main-header.component.html',
  styleUrls: ['./main-header.component.scss']
})
export class MainHeaderComponent implements OnInit {
  isSpeedDialOpen: boolean;
  progressCircleRadius = 20;
  circumference = this.progressCircleRadius * Math.PI * 2;

  @Input() drawer: MatDrawer;

  constructor(
    public readonly projectService: ProjectService,
    public readonly bookmarkService: BookmarkService,
    public readonly noteService: NoteService,
    public readonly taskService: TaskService,
    private readonly _matDialog: MatDialog,
    private readonly _layoutService: LayoutService,
  ) {
  }

  ngOnInit() {
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
