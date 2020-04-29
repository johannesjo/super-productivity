import {ChangeDetectionStrategy, Component} from '@angular/core';
import {FieldArrayType} from '@ngx-formly/core';
import {T} from 'src/app/t.const';
import {MatDialog} from '@angular/material/dialog';

@Component({
  selector: 'repeat-section-type',
  templateUrl: './repeat-section-type.component.html',
  styleUrls: ['./repeat-section-type.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class RepeatSectionTypeComponent extends FieldArrayType {
  T = T;

  constructor(private _matDialog: MatDialog) {
    super();
  }

  // NOTE: we're doing that on save click instead
  // removeItem(i: number) {
  // super.remove(i);
  // this._matDialog.open(DialogConfirmComponent, {
  //   restoreFocus: true,
  //   data: {
  //     message: T.F.SIMPLE_COUNTER.D_CONFIRM_REMOVE.MSG,
  //     okTxt: T.F.SIMPLE_COUNTER.D_CONFIRM_REMOVE.OK,
  //   }
  // }).afterClosed().subscribe((isConfirm: boolean) => {
  //   if (isConfirm) {
  //     console.log(this);
  //     super.remove(i);
  //   }
  // });
  // }

}
