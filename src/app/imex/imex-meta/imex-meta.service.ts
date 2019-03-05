import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class ImexMetaService {
  private _isDataImportInProgress$ = new BehaviorSubject<boolean>(false);
  isDataImportInProgress$: Observable<boolean> = this._isDataImportInProgress$.asObservable();
  isDataImportInProgress = false;

  constructor() {
    this.isDataImportInProgress$.subscribe((val) => this.isDataImportInProgress = val);
  }

  setInProgress(isInProgress: boolean) {
    this._isDataImportInProgress$.next(isInProgress);
  }
}
