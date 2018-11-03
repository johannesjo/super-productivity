import { Component, OnInit } from '@angular/core';
import { TaskService } from '../../tasks/task.service';
import { expandFadeAnimation } from '../../ui/animations/expand.ani';
import { LayoutService } from '../../core/layout/layout.service';

@Component({
  selector: 'work-view',
  templateUrl: './work-view-page.component.html',
  styleUrls: ['./work-view-page.component.scss'],
  animations: [expandFadeAnimation]
})
export class WorkViewPageComponent implements OnInit {
  isVertical = false;
  isHideControls: boolean;
  workedWithoutABreak = '-';
  isShowTimeWorkedWithoutBreak = true;

  // TODO
  isPlanYourDay = false; // = first start in day or no todays tasks at all (session needed)
  // close when starting a task
  isShowBacklog = false; // if isPlanYourDay and  show only if there are actually some
  splitInputPos = 0;

  constructor(
    public taskService: TaskService,
    private _layoutService: LayoutService
  ) {
    // this.focusTaskIdList$.subscribe(v => console.log(v));
  }

  ngOnInit() {
    if (this.isShowBacklog) {
      this.splitInputPos = 50;
    } else {
      this.splitInputPos = 100;
    }
  }


  showAddTaskBar() {
    this._layoutService.showAddTaskBar();
  }


  collapseAllNotesAndSubTasks() {

  }
}
