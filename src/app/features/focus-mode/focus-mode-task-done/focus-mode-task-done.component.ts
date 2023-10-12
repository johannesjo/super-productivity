import { ChangeDetectionStrategy, Component, OnInit } from '@angular/core';

@Component({
  selector: 'focus-mode-task-done',
  templateUrl: './focus-mode-task-done.component.html',
  styleUrls: ['./focus-mode-task-done.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class FocusModeTaskDoneComponent implements OnInit {
  constructor() {}

  ngOnInit(): void {}
}
