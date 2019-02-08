import { Component, OnInit, ChangeDetectionStrategy } from '@angular/core';
import { TaskService } from "../../../features/tasks/task.service";

@Component({
  selector: 'backlog-tabs',
  templateUrl: './backlog-tabs.component.html',
  styleUrls: ['./backlog-tabs.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class BacklogTabsComponent implements OnInit {

  selectedIndex = 0;

  constructor(
    public taskService: TaskService,
  ) { }

  ngOnInit() {
  }

  indexChange(index){

  }
}
