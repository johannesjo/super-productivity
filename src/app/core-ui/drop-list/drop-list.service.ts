import { Injectable } from '@angular/core';
import { CdkDropList } from '@angular/cdk/drag-drop';
import { BehaviorSubject, merge, of, Subject, timer } from 'rxjs';
import { map, startWith, switchMap } from 'rxjs/operators';

@Injectable({
  providedIn: 'root',
})
export class DropListService {
  dropLists = new BehaviorSubject<CdkDropList[]>([]);
  blockAniTrigger$ = new Subject<void>();
  isBlockAniAfterDrop$ = this.blockAniTrigger$.pipe(
    switchMap(() => merge(of(true), timer(1200).pipe(map(() => false)))),
    startWith(false),
  );

  registerDropList(dropList: CdkDropList, isSubTaskList = false): void {
    if (isSubTaskList) {
      this.dropLists.next([dropList, ...this.dropLists.getValue()]);
    } else {
      this.dropLists.next([...this.dropLists.getValue(), dropList]);
    }
    // Log.log(this.dropLists.getValue());
  }

  unregisterDropList(dropList: CdkDropList): void {
    this.dropLists.next(this.dropLists.getValue().filter((dl) => dl !== dropList));
  }
}
