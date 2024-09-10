import { Injectable } from '@angular/core';
import { CdkDropList } from '@angular/cdk/drag-drop';
import { BehaviorSubject } from 'rxjs';

@Injectable({
  providedIn: 'root',
})
export class DropListService {
  dropLists = new BehaviorSubject<CdkDropList[]>([]);

  registerDropList(dropList: CdkDropList): void {
    this.dropLists.next([...this.dropLists.getValue(), dropList]);
    console.log(this.dropLists.getValue());
  }

  unregisterDropList(dropList: CdkDropList): void {
    this.dropLists.next(this.dropLists.getValue().filter((dl) => dl !== dropList));
  }

  constructor() {}
}
