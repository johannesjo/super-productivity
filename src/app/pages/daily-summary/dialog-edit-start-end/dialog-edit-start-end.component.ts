import {ChangeDetectionStrategy, Component, OnDestroy, OnInit} from '@angular/core';
import {MatDialogRef} from '@angular/material';
import {ProjectService} from '../../../features/project/project.service';
import {Subscription} from 'rxjs';
import * as moment from 'moment-mini';
import {getWorklogStr} from '../../../util/get-work-log-str';
import {take} from 'rxjs/operators';

@Component({
  selector: 'dialog-edit-start-end',
  templateUrl: './dialog-edit-start-end.component.html',
  styleUrls: ['./dialog-edit-start-end.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class DialogEditStartEndComponent implements OnInit, OnDestroy {
  public startTime: string;
  public endTime: string;
  private _subs = new Subscription();

  constructor(
    private _matDialogRef: MatDialogRef<DialogEditStartEndComponent>,
    private _projectService: ProjectService,
  ) {
  }

  ngOnInit() {
    this._subs.add(this._projectService.workStartToday$
      .pipe(take(1))
      .subscribe((v) => {
        this.startTime = moment(v).format('HH:mm');
      }));
    this._subs.add(this._projectService.workEndToday$
      .pipe(take(1))
      .subscribe((v) => {
        this.endTime = moment(v).format('HH:mm');
      }));
  }

  ngOnDestroy(): void {
    this._subs.unsubscribe();
  }


  save() {
    const todayStr = getWorklogStr();
    const startTime = moment(todayStr + ' ' + this.startTime).unix() * 1000;
    const endTime = moment(todayStr + ' ' + this.endTime).unix() * 1000;

    if (startTime) {
      this._projectService.updateWorkStart(this._projectService.currentId, getWorklogStr(), startTime);
    }
    if (endTime) {
      this._projectService.updateWorkEnd(this._projectService.currentId, getWorklogStr(), endTime);
    }
    this.close();
  }

  close() {
    this._matDialogRef.close();
  }
}
