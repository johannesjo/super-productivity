import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable } from 'rxjs';

@Injectable({ providedIn: 'root' })
export class ImexMetaService {
  // TODO check if this is needed
  isDataImportInProgress: boolean = false;
  private _isDataImportInProgress$: BehaviorSubject<boolean> =
    new BehaviorSubject<boolean>(false);
  isDataImportInProgress$: Observable<boolean> =
    this._isDataImportInProgress$.asObservable();

  constructor() {
    this.isDataImportInProgress$.subscribe((val) => (this.isDataImportInProgress = val));
  }

  setDataImportInProgress(isInProgress: boolean) {
    this._isDataImportInProgress$.next(isInProgress);
  }
}
