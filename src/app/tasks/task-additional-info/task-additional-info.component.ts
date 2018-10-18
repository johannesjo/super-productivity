import { ChangeDetectionStrategy, Component, OnInit } from '@angular/core';
import { Input } from '@angular/core';
import { Output } from '@angular/core';
import { EventEmitter } from '@angular/core';

@Component({
  selector: 'task-additional-info',
  templateUrl: './task-additional-info.component.html',
  styleUrls: ['./task-additional-info.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class TaskAdditionalInfoComponent implements OnInit {
  @Input() task;
  @Output() onTaskNotesChanged: EventEmitter<string> = new EventEmitter();

  constructor() {
  }

  ngOnInit() {
  }

  changeTaskNotes($event) {
    this.onTaskNotesChanged.emit($event);
  }

}
