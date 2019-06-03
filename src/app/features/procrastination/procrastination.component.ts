import { Component, OnInit, ChangeDetectionStrategy } from '@angular/core';
import {TaskService} from '../tasks/task.service';

@Component({
  selector: 'procrastination',
  templateUrl: './procrastination.component.html',
  styleUrls: ['./procrastination.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class ProcrastinationComponent implements OnInit {

  constructor(
    public taskService: TaskService,
  ) { }

  ngOnInit() {
  }

}
