import {Injectable} from '@angular/core';
import {BehaviorSubject, Observable, of} from 'rxjs';
import {delay, distinctUntilChanged, map, switchMap} from 'rxjs/operators';

@Injectable({
  providedIn: 'root'
})
export class GlobalProgressBarService {
  nrOfRequests = new BehaviorSubject(0);
  isShowGlobalProgressBar$: Observable<boolean> = this.nrOfRequests.pipe(
    map(nr => nr > 0),
    distinctUntilChanged(),
    switchMap((isShow) => isShow
      ? of(isShow)
      : of(isShow).pipe(delay(100))
    ),
  );

  constructor() {
  }

  countUp() {
    this.nrOfRequests.next(this.nrOfRequests.getValue() + 1);
  }

  countDown() {
    this.nrOfRequests.next(this.nrOfRequests.getValue() - 1);
  }
}
