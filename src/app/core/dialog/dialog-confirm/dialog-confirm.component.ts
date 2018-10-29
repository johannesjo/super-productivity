import { Component, OnInit, ChangeDetectionStrategy } from '@angular/core';

@Component({
  selector: 'dialog-confirm',
  templateUrl: './dialog-confirm.component.html',
  styleUrls: ['./dialog-confirm.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class DialogConfirmComponent implements OnInit {

  constructor() { }

  ngOnInit() {
  }

}
