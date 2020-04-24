import {Injectable} from '@angular/core';
import {BehaviorSubject, Observable} from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class ImexMetaService {
  isDataImportInProgress = false;
  private _isDataImportInProgress$ = new BehaviorSubject<boolean>(false);
  isDataImportInProgress$: Observable<boolean> = this._isDataImportInProgress$.asObservable();

  constructor() {
    this.isDataImportInProgress$.subscribe((val) => this.isDataImportInProgress = val);
  }

  setDataImportInProgress(isInProgress: boolean) {
    this._isDataImportInProgress$.next(isInProgress);
  }
}
