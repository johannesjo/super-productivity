import { ChangeDetectionStrategy, Component } from '@angular/core';
import { GoogleApiService } from '../../google/google-api.service';
import { MatSnackBarRef } from '@angular/material';

@Component({
  selector: 'snack-google-login',
  templateUrl: './snack-google-login.component.html',
  styleUrls: ['./snack-google-login.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class SnackGoogleLoginComponent {
  public snackBarRef: MatSnackBarRef<SnackGoogleLoginComponent>;

  constructor(private readonly _googleApiService: GoogleApiService) {
  }

  loginToGoogle() {
    this._googleApiService.login()
      .then(() => {
        this.snackBarRef.dismiss();
      });
  }
}
