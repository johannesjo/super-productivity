import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { TakeABreakService } from './take-a-break.service';

@NgModule({
  declarations: [],
  imports: [
    CommonModule
  ],
  providers: [TakeABreakService]
})
export class TakeABreakModule {
  constructor(_takeABreakService: TakeABreakService) {
  }
}
