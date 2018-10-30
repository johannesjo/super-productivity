import { ChangeDetectionStrategy, Component, Inject } from '@angular/core';
import { GoogleApiService } from '../../google/google-api.service';
import { MAT_SNACK_BAR_DATA, MatSnackBarRef } from '@angular/material';
import { SnackParams } from '../snack.model';

@Component({
  selector: 'snack-google-login',
  templateUrl: './snack-google-login.component.html',
  styleUrls: ['./snack-google-login.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class SnackGoogleLoginComponent {
  public snackBarRef: MatSnackBarRef<SnackGoogleLoginComponent>;

  constructor(
    @Inject(MAT_SNACK_BAR_DATA) public data: SnackParams,
    private readonly _googleApiService: GoogleApiService
  ) {
  }

  loginToGoogle() {
    this._googleApiService.login()
      .then(() => {
        this.snackBarRef.dismiss();
      });
  }
}
