import {ChangeDetectionStrategy, Component, ElementRef, Input, OnInit, Renderer2, ViewChild} from '@angular/core';
import {ProjectService} from '../../features/project/project.service';
import {MatDrawer} from '@angular/material/sidenav';
import {LayoutService} from '../layout/layout.service';
import {BookmarkService} from '../../features/bookmark/bookmark.service';
import {NoteService} from '../../features/note/note.service';
import {TaskService} from '../../features/tasks/task.service';
import {PomodoroService} from '../../features/pomodoro/pomodoro.service';
import {T} from '../../t.const';
import {BannerService} from '../../core/banner/banner.service';

@Component({
  selector: 'main-header',
  templateUrl: './main-header.component.html',
  styleUrls: ['./main-header.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class MainHeaderComponent implements OnInit {
  T = T;
  progressCircleRadius = 10;
  circumference = this.progressCircleRadius * Math.PI * 2;

  @Input() drawer: MatDrawer;
  @ViewChild('circleSvg', {static: true}) circleSvg: ElementRef;

  constructor(
    public readonly projectService: ProjectService,
    public readonly bookmarkService: BookmarkService,
    public readonly noteService: NoteService,
    public readonly taskService: TaskService,
    public readonly bannerService: BannerService,
    public readonly pomodoroService: PomodoroService,
    public readonly layoutService: LayoutService,
    private readonly _renderer: Renderer2,
  ) {
  }

  ngOnInit() {
    this.taskService.currentTaskProgress$.subscribe((progressIN) => {
      let progress = progressIN || 1;
      if (progress > 1) {
        progress = 1;
      }
      const dashOffset = this.circumference * -1 * progress;
      this._renderer.setStyle(this.circleSvg.nativeElement, 'stroke-dashoffset', dashOffset);
    });
  }
}
