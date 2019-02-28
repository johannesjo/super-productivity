import { Injectable } from '@angular/core';
import { Observable, ReplaySubject } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class ImexMetaService {
  private _isDataImportInProgress$ = new ReplaySubject<boolean>();
  isDataImportInProgress$: Observable<boolean> = this._isDataImportInProgress$.asObservable();
  isDataImportInProgress: boolean = false;

  constructor() {
    this.isDataImportInProgress$.subscribe((val) => this.isDataImportInProgress = val);
  }

  setInProgress(isInProgress: boolean) {
    this._isDataImportInProgress$.next(isInProgress);
  }
}
