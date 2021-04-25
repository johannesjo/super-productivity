import { Component, OnInit, ChangeDetectionStrategy } from '@angular/core';

@Component({
  selector: 'timeline',
  templateUrl: './timeline.component.html',
  styleUrls: ['./timeline.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class TimelineComponent implements OnInit {

  constructor() { }

  ngOnInit(): void {
  }

}
